'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Search, Printer, FileText, User, ArrowLeft, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { useHelpdeskPatients } from "@/lib/integrations";
import { sanitizePatientName } from "@/lib/utils/name-utils";
import { calculateAge } from "@/lib/utils/date-utils";
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import toast from 'react-hot-toast';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numberToWords = (num: number): string => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (isNaN(num)) return 'not a number';
    const s = num.toString().replace(/[\, ]/g, '');
    let x = s.indexOf('.');
    if (x === -1) x = s.length;
    if (x > 15) return 'too big';
    const n = s.split('');
    let str = '';
    let sk = 0;
    for (let i = 0; i < x; i++) {
        if ((x - i) % 3 === 2) {
            if (n[i] === '1') {
                str += a[Number(n[i]) + Number(n[i + 1])] + ' ';
                i++;
                sk = 1;
            } else if (n[i] !== '0') {
                str += b[Number(n[i])] + ' ';
                sk = 1;
            }
        } else if (n[i] !== '0') {
            str += a[Number(n[i])] + ' ';
            if ((x - i) % 3 === 0) str += 'Hundred ';
            sk = 1;
        }
        if ((x - i) % 3 === 1) {
            if (sk) str += (x - i - 1 === 3) ? 'Thousand ' : (x - i - 1 === 6) ? 'Million ' : (x - i - 1 === 9) ? 'Billion ' : '';
            sk = 0;
        }
    }
    return str.trim() ? str.trim() + ' Rupees Only' : '';
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function FinalBillPage() {
    const router = useRouter();
    const params = useParams() as any;
    
    // Search & Pagination State for Table
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;
    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: patientsRaw, isLoading, isFetching, refetch } = useHelpdeskPatients(
        debouncedSearch,
        page,
        limit,
        'ipd', // Force IPD patients only
        undefined,
        true
    );

    const { patients, total } = useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return { patients: [] as any[], total: 0 };
        if (Array.isArray(raw)) return { patients: raw, total: raw.length };
        return {
            patients: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
        };
    }, [patientsRaw]);
    
    const totalPages = Math.ceil(total / limit);
    const showRefreshing = isFetching && !isLoading && patientsRaw;

    // Bill State
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [hospital, setHospital] = useState<any>(null);
    const [admission, setAdmission] = useState<any>(null);
    const [latestReport, setLatestReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        hospitalAdminService.getHospital().then(res => setHospital(res?.hospital)).catch(() => {});
    }, []);

    const handleSelectPatient = async (patient: any) => {
        const pId = patient.user?._id || patient._id || patient.id;
        const docRef = patient.doctorReference || patient.profile?.doctorReference || patient.user?.doctorReference || patient.lastVisit?.doctorReference || patient.patientDetails?.doctorReference || '';
        setSelectedPatient({
            ...patient,
            _id: pId,
            name: patient.user?.name || patient.name,
            mobile: patient.user?.mobile || patient.profile?.contactNumber || patient.mobile || 'N/A',
            mrn: patient.mrn || patient.profile?.mrn || 'N/A',
            doctorReference: docRef,
            referredBy: docRef,
        });
        setLatestReport(null);
        fetchPatientBillingData(pId);
    };

    const fetchPatientBillingData = async (pId: string) => {
        setLoadingReport(true);
        
        // Helper: race any promise against a timeout
        const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
            Promise.race([
                promise,
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
            ]);

        try {
            // Run both API calls in parallel with a 10s timeout each
            const [admissionsResult, reportsResult] = await Promise.allSettled([
                withTimeout(helpdeskService.getPatientIPDAdmissions(pId), 10000),
                withTimeout(
                    helpdeskService.getPatientTransactionReports(pId).then(savedReports => {
                        if (savedReports && Array.isArray(savedReports) && savedReports.length > 0) {
                            return savedReports;
                        }
                        return helpdeskService.getIPDFinalBill(pId);
                    }).catch((err: any) => {
                        console.log("Failed to fetch saved reports, falling back to dynamic IPD bill.", err);
                        return helpdeskService.getIPDFinalBill(pId);
                    }),
                    10000
                ),
            ]);

            // Process admissions
            if (admissionsResult.status === 'fulfilled') {
                const admissions = admissionsResult.value;
                const admissionList = Array.isArray(admissions) ? admissions : (admissions as any).admissions || [];
                if (admissionList.length > 0) {
                    setAdmission(admissionList.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]);
                }
            } else {
                console.warn("Admissions fetch failed/timed out:", admissionsResult.reason);
            }

            // Process reports
            if (reportsResult.status === 'fulfilled') {
                const reports = reportsResult.value;
                if (reports && (reports as any[]).length > 0) {
                    setLatestReport((reports as any[])[0]);
                    toast.success("Latest bill loaded successfully.");
                } else {
                    toast.error("No bill data found for this patient.");
                }
            } else {
                console.warn("Reports fetch failed/timed out:", reportsResult.reason);
                toast.error("Failed to load billing data (request timed out).");
            }
        } catch (err) {
            console.error("Failed to fetch billing data", err);
            toast.error("Failed to load billing data.");
        } finally {
            setLoadingReport(false);
        }
    };

    const handlePrint = () => {
        if (!latestReport) {
            toast.error("No bill data to print.");
            return;
        }

        const win = window.open('', '_blank');
        if (!win) {
            alert('Please allow popups to print');
            return;
        }

        const h = hospital || { name: 'Hospital Name', address: 'Hospital Address', contact: 'Contact Info' };
        const data = latestReport.reportData;
        const pt = latestReport.patientInfo || selectedPatient;
        const adm = latestReport.admissionInfo || admission;
        const hInfo = latestReport.hospitalInfo || {};
        const dateNow = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const referralDoctor = 
            latestReport.doctorReference ||
            latestReport.referredBy ||
            latestReport.patientInfo?.doctorReference ||
            latestReport.patientInfo?.referredBy ||
            latestReport.admissionInfo?.doctorReference ||
            latestReport.admissionInfo?.referredBy ||
            latestReport.reportData?.doctorReference ||
            latestReport.reportData?.referredBy ||
            pt?.doctorReference ||
            pt?.referredBy ||
            pt?.profile?.doctorReference ||
            selectedPatient?.doctorReference ||
            selectedPatient?.profile?.doctorReference ||
            selectedPatient?.lastVisit?.doctorReference ||
            adm?.doctorReference ||
            adm?.referredBy ||
            '';

        const headerHtml = renderToStaticMarkup(
            <MainHeader
                initialDetails={{
                    name: hInfo.name || h.name || "Hospital Name",
                    address: hInfo.address || h.address || "",
                    phone: hInfo.phone || (h as any).phone || (h as any).mobile || "",
                    email: hInfo.email || h.email || "",
                    logo: hInfo.logo || (h as any).logo
                }}
            />
        );

        // Patient type display
        const patientType = adm?.admissionType || 'IPD-Cash';
        const patientTypeDisplay = patientType.toUpperCase().includes('INSURANCE') ? 'IPD-Insurance' : 'IPD-Cash';

        // Discharge date formatting
        const dischargeDt = adm?.dischargeDate ? new Date(adm.dischargeDate).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        }) : '';

        // Admission date formatting
        const admissionDt = adm?.admissionDate ? new Date(adm.admissionDate).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        }) : '';

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>IP Interim Bill - ${pt.name}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; color: #000; font-size: 10px; line-height: 1.3; background: #fff; margin: 0; }
                    .header-custom { text-align: center; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 5px; }
                    .header-custom h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
                    .header-custom p { margin: 2px 0; font-size: 10px; }
                    .bill-title { text-align: center; font-weight: bold; font-size: 12px; margin: 0; padding: 4px 0; border: 1px solid #000; border-bottom: none; }
                    .invoice-no { text-align: center; font-weight: bold; font-size: 11px; margin: 0 0 10px 0; padding: 4px 0; border: 1px solid #000; }
                    
                    .patient-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000; }
                    .patient-details-table td { padding: 3px 5px; vertical-align: top; font-size: 9px; }
                    .patient-details-table .lbl { width: 105px; font-weight: bold; }
                    .patient-details-table .val { width: auto; }
                    
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; border-top: none; }
                    .items-table th { background: #fff; border: 1px solid #000; border-bottom: 2px solid #000; border-top: 2px solid #000; padding: 4px 5px; text-align: left; font-size: 9px; font-weight: bold; }
                    .items-table td { border-left: none; border-right: none; padding: 3px 5px; font-size: 9px; }
                    .items-table .category-row td { background: #fff; font-weight: bold; text-align: left; color: #000080; padding-top: 8px; padding-bottom: 4px; text-transform: uppercase; font-size: 10px; }
                    .items-table .subtotal-row td { background: #fff; font-weight: bold; text-align: right; color: #000; border-top: 1px solid #000; border-bottom: 1px solid #000; }
                    .items-table .subtotal-amount { color: #000080; }
                    .items-table .total-amount-cell { text-align: right; }
                    .items-table .right-align { text-align: right; }
                    .items-table .center-align { text-align: center; }

                    .summary-section { width: 100%; display: table; margin-top: 5px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; }
                    .amount-words { display: table-cell; width: 60%; vertical-align: top; font-weight: bold; font-size: 10px; padding: 5px; }
                    .amount-words .reason { font-weight: normal; margin-top: 5px; }
                    .totals-box { display: table-cell; width: 40%; vertical-align: top; }
                    .totals-table { width: 100%; border-collapse: collapse; }
                    .totals-table td { padding: 3px; font-size: 10px; }
                    .totals-table .lbl { font-weight: bold; text-align: right; width: 60%; }
                    .totals-table .val { text-align: right; font-weight: bold; }
                    .totals-table .grand-row td { border-top: 1px solid #000; font-size: 11px; }
                    .totals-table .balance-row td { border-top: 1px solid #000; border-bottom: 2px solid #000; font-size: 11px; color: #c00; }

                    .receipts-title { font-weight: bold; margin: 10px 0 5px; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 3px; background: #e8e8ff; }
                    .receipts-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .receipts-table th, .receipts-table td { padding: 4px; font-size: 9px; text-align: left; }
                    .receipts-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; }
                    .receipts-table .total-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; }
                    .receipts-table .right-align { text-align: right; }

                    .footer-signatures { width: 100%; display: table; margin-top: 50px; font-size: 11px; }
                    .footer-signatures > div { display: table-cell; width: 50%; }
                    .footer-signatures .left-sig { text-align: left; padding-left: 10%; font-weight: bold; }
                    .footer-signatures .right-sig { text-align: right; padding-right: 10%; font-weight: bold; }
                    .sig-line { border-top: 1px solid #000; width: 200px; margin-bottom: 5px; display: inline-block; }
                    
                    .printed-time { border-top: 1px solid #000; padding-top: 5px; margin-top: 20px; font-weight: bold; font-size: 9px; }

                    .page-header { display: none; }

                    @media print { 
                        body { padding: 0; } 
                        @page { margin: 10mm; }
                        .items-table { page-break-inside: auto; }
                        .items-table tr { page-break-inside: avoid; page-break-after: auto; }
                        .page-header { display: block; position: running(pageHeader); font-size: 9px; font-weight: bold; padding: 5px 0; border-bottom: 1px solid #000; margin-bottom: 5px; }
                    }
                </style>
            </head>
            <body>
                <div class="header-custom">
                    ${headerHtml}
                </div>
                
                <div class="bill-title">IP Interim Bill-Detailed</div>
                <div class="invoice-no">BILL OF SUPPLY / INVOICE NO : ${latestReport._id?.toString().slice(-8).toUpperCase() || 'N/A'}</div>

                <table class="patient-details-table">
                    <tr>
                        <td class="lbl">CIN No</td><td class="val">: </td>
                        <td class="lbl">GST No</td><td class="val">: ${hInfo.gstNumber || hospital?.gstNumber || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Patient Name</td><td class="val">: ${pt.name || ''}</td>
                        <td class="lbl">IP No</td><td class="val">: ${adm?.admissionId || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Age/Sex</td><td class="val">: ${[pt?.age || pt?.profile?.age || pt?.patientDetails?.age || calculateAge(pt?.dob || pt?.profile?.dob || pt?.patientDetails?.dob) ? (pt?.age || pt?.profile?.age || pt?.patientDetails?.age || calculateAge(pt?.dob || pt?.profile?.dob || pt?.patientDetails?.dob)) + 'Y' : '', pt?.gender || pt?.profile?.gender || pt?.patientDetails?.gender ? (pt?.gender || pt?.profile?.gender || pt?.patientDetails?.gender).charAt(0).toUpperCase() + (pt?.gender || pt?.profile?.gender || pt?.patientDetails?.gender).slice(1) : ''].filter(Boolean).join(' / ') || 'N/A'}</td>
                        <td class="lbl">UMR No</td><td class="val">: ${pt.mrn || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">S/W/D</td><td class="val">: ${pt.guardianName ? pt.guardianName + (pt.guardianRelation ? ' (' + pt.guardianRelation + ')' : '') : ''}</td>
                        <td class="lbl">Bill No</td><td class="val">: ${latestReport._id?.toString().slice(-6).toUpperCase() || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Doctor</td><td class="val">: ${adm?.doctorName || ''}</td>
                        <td class="lbl">Bill Dt</td><td class="val">: ${dateNow}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Admission Dt</td><td class="val">: ${admissionDt}</td>
                        <td class="lbl">Discharge Type</td><td class="val">: ${adm?.dischargeType || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Organization</td><td class="val">: </td>
                        <td class="lbl">Discharge Dt&Tm</td><td class="val">: ${dischargeDt}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Patient Type</td><td class="val">: <b>${patientTypeDisplay}</b></td>
                        <td class="lbl">Ward</td><td class="val">: ${adm?.wardName || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Secondary Dr.</td><td class="val">: </td>
                        <td class="lbl">Bed No</td><td class="val">: ${adm?.bedNumber || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Address</td><td class="val">: ${pt.address || ''}</td>
                        <td class="lbl">Phone No</td><td class="val">: ${pt.mobile || ''}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Referal By</td><td class="val">: ${referralDoctor}</td>
                        <td class="lbl"></td><td class="val"></td>
                    </tr>
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%" class="center-align">S.No</th>
                            <th style="width: 10%">Code</th>
                            <th style="width: 45%">Service Name</th>
                            <th style="width: 15%" class="right-align">Rate</th>
                            <th style="width: 10%" class="center-align">Qty</th>
                            <th style="width: 15%" class="right-align">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Helper to render a category section
        const renderCategory = (title: string, items: any[], nameKey: string, rateKey: string, qtyKey: string) => {
            if (!items || items.length === 0) return '';
            let catHtml = `<tr class="category-row"><td colspan="6">${title}</td></tr>`;
            let subtotal = 0;
            let sno = 1;
            items.forEach(item => {
                const amount = (item.amount !== undefined && item.amount !== null) ? item.amount : (item[rateKey] * item[qtyKey]);
                subtotal += amount;
                const rawName = item[nameKey];
                const displayName = typeof rawName === 'object'
                    ? (rawName?.testName || rawName?.name || rawName?.title || rawName?.description || item.description || '-')
                    : (String(rawName || '').trim() === '[object Object]' ? (item.description || '-') : (rawName || '-'));
                let itemCode = item.code || item.serviceCode || item.testCode || item.itemCode || '';
                if (!itemCode || itemCode === '-') {
                    const prefix = title.toLowerCase().includes('consultation') ? 'SVC'
                        : title.toLowerCase().includes('investigation') ? 'LAB'
                        : title.toLowerCase().includes('ward') ? 'BED'
                        : title.toLowerCase().includes('radiology') ? 'RAD'
                        : title.toLowerCase().includes('pharmacy') ? 'MED'
                        : 'SVC';
                    const idSuffix = item._id ? item._id.toString().slice(-6).toUpperCase()
                        : (item.id && typeof item.id === 'string' && item.id.length >= 4) ? item.id.slice(-6).toUpperCase()
                        : `${sno}`;
                    itemCode = prefix === 'BED' ? `BED${sno}` : `${prefix}${idSuffix}`;
                }

                catHtml += `
                    <tr>
                        <td class="center-align">${sno++}</td>
                        <td>${itemCode}</td>
                        <td>${displayName}</td>
                        <td class="right-align">${fmt(item[rateKey])}</td>
                        <td class="center-align">${parseFloat(item[qtyKey]).toFixed(2)}</td>
                        <td class="right-align">${fmt(amount)}</td>
                    </tr>
                `;
            });
            catHtml += `<tr class="subtotal-row"><td colspan="5">Sub Total :</td><td class="right-align subtotal-amount">${fmt(subtotal)}</td></tr>`;
            return catHtml;
        };

        // Render exactly matching image order: Consultation -> Investigation -> Ward -> Radiology -> Service -> Pharmacy
        html += renderCategory('Consultation Charges', data.doctors, 'doctorName', 'rate', 'visits');
        html += renderCategory('Investigation Charges', data.diags, 'testName', 'rate', 'quantity');
        html += renderCategory('Ward Charges', data.admissions, 'chargeType', 'rate', 'days');
        html += renderCategory('Radiology Charges', data.rads || [], 'testName', 'rate', 'quantity');
        html += renderCategory('Service Charges', data.services, 'serviceName', 'rate', 'quantity');
        html += renderCategory('Pharmacy Charges', data.meds, 'medicineName', 'rate', 'quantity');

        html += `
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="amount-words">
                        Rupees In : ${numberToWords(latestReport.totals.netAmount || latestReport.totals.grandTotal)}
                        <div class="reason">Reason : ${latestReport.notes || adm?.reason || '-'}</div>
                    </div>
                    <div class="totals-box">
                        <table class="totals-table">
                            <tr class="grand-row"><td class="lbl">Total Charges :</td><td class="val">${fmt(latestReport.totals.grandTotal)}</td></tr>
                            ${latestReport.totals.returnCredits ? `<tr><td class="lbl" style="color: #c00;">(-) Returns :</td><td class="val" style="color: #c00;">${fmt(latestReport.totals.returnCredits)}</td></tr>` : ''}
                            ${latestReport.totals.discount ? `<tr><td class="lbl" style="color: #0f766e;">(-) Discount :</td><td class="val" style="color: #0f766e;">${fmt(latestReport.totals.discount)}</td></tr>` : ''}
                            <tr><td class="lbl">Net Bill Amt :</td><td class="val">${fmt(latestReport.totals.netAmount || latestReport.totals.grandTotal)}</td></tr>
                            <tr><td class="lbl">Paid Amt :</td><td class="val">${fmt(latestReport.totals.totalPaid)}</td></tr>
                            <tr class="balance-row"><td class="lbl">Balance Amt :</td><td class="val">${fmt(latestReport.totals.balance)}</td></tr>
                        </table>
                    </div>
                </div>
        `;

        const receiptsToPrint = latestReport.receipts || (latestReport.reportData && latestReport.reportData.payments) || [];
        if (receiptsToPrint && receiptsToPrint.length > 0) {
            html += `
                <div class="receipts-title">Receipt Details :</div>
                <table class="receipts-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">S.No</th>
                            <th style="width: 15%">Record Date</th>
                            <th style="width: 20%">Receipt No</th>
                            <th style="width: 40%">Amount Payment</th>
                            <th style="width: 20%">Type</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            let rSno = 1;
            receiptsToPrint.forEach((r: any) => {
                // Ignore failed or pending payments if status exists
                if (r.status && r.status !== 'Paid' && r.status !== 'Completed') return;

                const rDate = new Date(r.date || r.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const rMode = r.paymentMode || r.mode || 'Cash';
                const receiptNum = r.receiptNumber || r.receiptNo || r.transactionId || '-';
                const rType = r.type || r.transactionType || 'Advance';
                html += `
                    <tr>
                        <td>${rSno++}</td>
                        <td>${rDate}</td>
                        <td>${receiptNum}</td>
                        <td>${fmt(r.amount)} ${rMode}</td>
                        <td>${rType}</td>
                    </tr>
                `;
            });
            html += `
                        <tr class="total-row">
                            <td colspan="3" class="right-align">Total :</td>
                            <td>${fmt(latestReport.totals.totalPaid)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        html += `
                <div class="footer-signatures">
                    <div class="left-sig">
                        <div class="sig-line"></div><br/>
                        Patient/Attendant Signatory
                    </div>
                    <div class="right-sig">
                        <br/>
                        Authorised Signatory
                    </div>
                </div>
                
                <div class="printed-time">
                    Printed Dt & Time : ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <script>
                    window.onload = function() { 
                        setTimeout(() => {
                            window.print(); 
                            window.onafterprint = function() { window.close(); }
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="max-w-full mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm shadow-indigo-500/5">
                <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50/50">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Final Bill Generate</h1>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Select patient to print IP Interim Bill</p>
                    </div>
                </div>
                {!selectedPatient && (
                    <div className="relative flex-1 max-w-sm group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[16px]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Name, MRN, Mobile..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-indigo-500 shadow-inner transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Content Area */}
            {selectedPatient ? (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm text-center">
                    {loadingReport ? (
                        <div className="py-10">
                            <RefreshCw className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                            <p className="text-sm font-bold text-slate-500">Fetching latest billing data...</p>
                        </div>
                    ) : latestReport ? (
                        <div className="py-8">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
                                <FileText size={36} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-2">Ready to Print Final Bill</h2>
                            <p className="text-sm font-bold text-slate-500 mb-8">
                                Found latest transaction report for <b>{selectedPatient.name}</b>.
                            </p>

                            <div className="flex justify-center gap-4">
                                <button 
                                    onClick={() => { setSelectedPatient(null); setLatestReport(null); }}
                                    className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handlePrint}
                                    className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                                >
                                    <Printer size={18} />
                                    Print IP Interim Bill - Detailed
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10">
                            <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                            <h3 className="text-lg font-black text-slate-800 mb-2">No Saved Bills Found</h3>
                            <p className="text-sm font-bold text-slate-500 mb-6">
                                There are no finalized transaction reports for this patient. Please create and save a report in the Transaction Reports section first.
                            </p>
                            <div className="flex justify-center gap-4">
                                <button 
                                    onClick={() => setSelectedPatient(null)}
                                    className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Go Back
                                </button>
                                <button 
                                    onClick={() => router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${selectedPatient._id}`)}
                                    className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-colors"
                                >
                                    Go to Transaction Reports
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Patient Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="overflow-x-auto w-full no-scrollbar">
                            {(isLoading && patients.length === 0) ? (
                                <div className="py-32 flex flex-col items-center justify-center gap-4">
                                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry...</p>
                                </div>
                            ) : patients.length > 0 ? (
                                <table className="w-full min-w-[700px] table-auto">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            <th className="w-16 px-4 py-3 sm:py-4 text-center">#</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left w-44">MRN Number</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left min-w-[200px]">Patient Name</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center w-24">Age</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center w-24">Gender</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left w-auto">Phone Number</th>
                                            <th className="min-w-[120px] px-4 py-3 sm:py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patients.map((patient: any, idx: number) => {
                                            const patientId = patient._id || patient.id;
                                            const serialNo = ((page - 1) * limit) + idx + 1;

                                            return (
                                                <tr key={`${patientId}-${idx}`} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[11px] lg:text-[13px] font-black text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                            {serialNo.toString().padStart(2, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4">
                                                        <span className="text-[12px] lg:text-[13px] font-extrabold text-slate-700 uppercase tracking-wider bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60 inline-block">
                                                            {patient.profile?.mrn || patient.mrn}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 transition-all flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                                                {sanitizePatientName(patient.name || patient.user?.name).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-[13px] lg:text-[15px] font-[550] text-slate-700 uppercase tracking-tight truncate block">
                                                                    {sanitizePatientName(patient.name || patient.user?.name)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[12px] lg:text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200/50 px-2 py-1 rounded-lg">
                                                            {patient.profile?.age || patient.age || calculateAge(patient.profile?.dob || patient.dob)} <span className="text-[9px] text-slate-400">YRS</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[10px] lg:text-[12px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/10 px-2 py-0.5 rounded-full border border-slate-200/20">
                                                            {patient.profile?.gender || patient.gender}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[11px] lg:text-[13px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                                                            {patient.mobile || patient.user?.mobile || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleSelectPatient(patient)}
                                                                className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                                                title="Print IP Bill"
                                                            >
                                                                <Printer size={14} /> <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">Print</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-32 text-center">
                                    <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No IPD patients found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && patients.length > 0 && (
                        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                                    Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} patients
                                </div>

                                <div className="flex items-center gap-2 pr-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        <ChevronLeft size={14} /> Prev
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                                            const pageNum = i + 1;
                                            const showPage = pageNum <= 5 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1);

                                            if (!showPage && pageNum === 6 && page > 7) {
                                                return <span key={pageNum} className="px-2 text-slate-400">...</span>;
                                            }
                                            if (!showPage) return null;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${page === pageNum
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                                        : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
