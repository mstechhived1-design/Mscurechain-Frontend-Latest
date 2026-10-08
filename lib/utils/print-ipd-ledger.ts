import { format } from "date-fns";
import { formatDoctorName, formatPatientNameWithPrefix } from '@/lib/utils/name-utils';

function numberToWords(num: number): string {
    const a = [
        "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ",
        "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if ((num = num.toString().replace(/[\, ]/g, "") as any) != parseFloat(num as any)) return "Not a Number";

    // Fix for decimals: split by dot and take integer part
    const intPart = Math.floor(parseFloat(num as any));

    let n = ("000000000" + intPart).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += n[1] != "00" ? (a[Number(n[1])] || b[n[1][0] as any] + " " + a[n[1][1] as any]) + "Crore " : "";
    str += n[2] != "00" ? (a[Number(n[2])] || b[n[2][0] as any] + " " + a[n[2][1] as any]) + "Lakh " : "";
    str += n[3] != "00" ? (a[Number(n[3])] || b[n[3][0] as any] + " " + a[n[3][1] as any]) + "Thousand " : "";
    str += n[4] != "0" ? (a[Number(n[4])] || b[n[4][0] as any] + " " + a[n[4][1] as any]) + "Hundred " : "";
    str += n[5] != "00" ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0] as any] + " " + a[n[5][1] as any]) : "";
    return str.trim();
}

export const printIPDLedger = (summary: any, hospitalDetails?: any, options: { format?: 'summary' | 'detailed' } = { format: 'detailed' }) => {
    const isSummary = options.format === 'summary';
    // Determine components
    const patientName = formatPatientNameWithPrefix(
        summary?.patientName || "Unknown Patient",
        summary?.patientHonorific || summary?.patientPrefix || summary?.honorific || summary?.prefix
    );
    const admissionId = summary?.admissionId || "N/A";

    // Extract items by category
    const extraItems = summary?.extraCharges?.items || [];
    const bedItems = summary?.bedCharges?.items || [];
    const advanceItems = summary?.advances || [];
    const financials = summary?.financials || { totalAdvance: 0, balance: 0, discount: 0 };

    const categories: any = [
        { name: 'Consultation Charges', items: [], total: 0 },
        { name: 'INVESTIGATION CHARGES', items: [], total: 0 },
        { name: 'Ward Charges', items: [], total: 0 },
        { name: 'Radiology Charges', items: [], total: 0 },
        { name: 'SERVICE CHARGES', items: [], total: 0 },
        { name: 'PHARMACY CHARGES', items: [], total: 0 },
    ];

    extraItems.forEach((item: any) => {
        if (item.status === 'Reversed') return;

        let targetCategory = 'SERVICE CHARGES';
        if (['Doctor Fee', 'Consultation'].includes(item.category)) {
            targetCategory = 'Consultation Charges';
        } else if (['Lab', 'Diagnostics'].includes(item.category)) {
            targetCategory = 'INVESTIGATION CHARGES';
        } else if (['Pharmacy', 'Medicine'].includes(item.category)) {
            targetCategory = 'PHARMACY CHARGES';
        } else if (['Radiology'].includes(item.category)) {
            targetCategory = 'Radiology Charges';
        }

        const catIndex = categories.findIndex((c: any) => c.name === targetCategory);
        if (catIndex > -1) {
            // ── PHARMACY: Expand nested medicines into individual rows ──
            if (targetCategory === 'PHARMACY CHARGES' && item.medicines && Array.isArray(item.medicines) && item.medicines.length > 0) {
                item.medicines.forEach((med: any) => {
                    const medAmount = med.amount || (parseFloat(med.quantity || '1') * (med.rate || med.price || 0));
                    categories[catIndex].items.push({
                        code: item._id?.toString()?.substring(0, 7).toUpperCase() || 'ITEM' + Math.floor(Math.random() * 9000 + 1000),
                        name: med.medicineName || med.name || 'Unknown Medicine',
                        rate: med.rate || med.price || medAmount,
                        qty: med.quantity || 1,
                        amount: medAmount
                    });
                    categories[catIndex].total += medAmount;
                });
                return; // Skip the lump-sum parent entry
            }

            // ── LAB: Expand nested tests into individual rows ──
            if (targetCategory === 'INVESTIGATION CHARGES' && item.tests && Array.isArray(item.tests) && item.tests.length > 0) {
                const totalAmount = item.amount || 0;
                const testCount = item.tests.length;

                item.tests.forEach((test: any, tIdx: number) => {
                    const testName = typeof test === 'string' ? test : (test.testName || test.test?.testName || test.test?.name || test.name || test.test || 'Unknown Test');
                    
                    let testPrice = totalAmount / testCount;
                    if (typeof test === 'object') {
                        const possiblePrices = [
                            test.cost, test.price, test.amount, test.testPrice, 
                            test.test?.price, test.test?.cost, test.test?.amount, 
                            test.testId?.price, test.testId?.cost
                        ];
                        const foundPrice = possiblePrices.find(p => p !== undefined && p !== null);
                        if (foundPrice !== undefined) {
                            testPrice = Number(foundPrice);
                        }
                    }

                    const testCode = (typeof test === 'object' && test._id) ? test._id.toString().substring(0, 7).toUpperCase() :
                                     (typeof test === 'object' && test.test?._id) ? test.test._id.toString().substring(0, 7).toUpperCase() :
                                     (typeof test === 'object' && test.testId?._id) ? test.testId._id.toString().substring(0, 7).toUpperCase() :
                                     (typeof test === 'object' && test.test) ? String(test.test).substring(0, 7).toUpperCase() :
                                     item._id?.toString()?.substring(0, 7).toUpperCase() || 'SER' + Math.floor(Math.random() * 9000 + 1000);

                    categories[catIndex].items.push({
                        code: testCode,
                        name: testName,
                        rate: testPrice,
                        qty: 1,
                        amount: testPrice
                    });
                    categories[catIndex].total += testPrice;
                });
                return; // Skip the lump-sum parent entry
            }

            // ── DEFAULT: Single line item (Consultation, Service, Radiology, etc.) ──
            categories[catIndex].items.push({
                code: item.code || item._id?.toString()?.substring(0, 7).toUpperCase() || 'SER' + Math.floor(Math.random() * 900 + 100),
                name: item.description || item.category,
                rate: item.amount || 0,
                qty: item.quantity || 1,
                amount: item.amount || 0
            });
            categories[catIndex].total += (item.amount || 0);
        }
    });

    bedItems.forEach((item: any) => {
        const catIndex = categories.findIndex((c: any) => c.name === 'Ward Charges');
        categories[catIndex].items.push({
            code: 'SG' + Math.floor(Math.random() * 900 + 1000),
            name: `${item.type} CHARGES${item.readableDuration ? ` (${item.readableDuration})` : ''}`,
            rate: item.rate,
            qty: Number((item.days || 1).toFixed(2)),
            amount: item.charge
        });
        categories[catIndex].total += (item.charge || 0);
    });

    const activeCategories = categories.filter((c: any) => c.items.length > 0);

    // Calculate Totals
    const totalCharges = activeCategories.reduce((sum: number, cat: any) => sum + cat.total, 0);
    const totalDeposits = financials.totalAdvance || 0;
    const discount = financials.discount || 0;
    const returnCredits = financials.returnCredits || 0;

    const netBill = Math.max(0, totalCharges - returnCredits - discount);
    const balanceDue = Math.max(0, netBill - totalDeposits);

    // Static / Map Fields
    const cinNo = hospitalDetails?.cinNo || "";
    const gstNo = hospitalDetails?.gstNumber || "";
    const ipNo = admissionId;
    const rawAge = summary?.patientAge ?? summary?.age ?? summary?.patientDetails?.age ?? summary?.patient?.age ?? summary?.patient?.profile?.age ?? (summary?.patient?.dob || summary?.patient?.profile?.dob || summary?.patientDetails?.dob ? Math.floor((Date.now() - new Date(summary?.patient?.dob || summary?.patient?.profile?.dob || summary?.patientDetails?.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "") ?? "";
    const rawAgeUnit = summary?.patientAgeUnit || summary?.ageUnit || summary?.patientDetails?.ageUnit || summary?.patient?.ageUnit || summary?.patient?.profile?.ageUnit || "Y";
    const rawGender = summary?.patientGender || summary?.gender || summary?.patientDetails?.gender || summary?.patient?.gender || summary?.patient?.profile?.gender || "";
    const formattedAge = rawAge !== "" ? (/[a-zA-Z]/.test(rawAge.toString()) ? rawAge.toString() : `${rawAge} ${rawAgeUnit}`) : '';
    const ageSex = [formattedAge, rawGender ? rawGender.charAt(0).toUpperCase() + rawGender.slice(1) : ''].filter(Boolean).join(" / ") || "N/A";
    const umrNo = summary?.mrn || summary?.patient?.mrn || summary?.patient?.profile?.mrn || "";
    const billNo = summary?.billNumber || "";
    const billDt = format(new Date(), 'dd-MMM-yyyy');
    const doctor =
        (typeof summary?.primaryDoctor === 'string' ? summary.primaryDoctor : '') ||
        summary?.primaryDoctor?.user?.name ||
        summary?.primaryDoctor?.name ||
        summary?.primaryDoctorName ||
        summary?.doctorName ||
        summary?.doctor?.user?.name ||
        summary?.doctor?.name ||
        (typeof summary?.doctor === 'string' ? summary.doctor : '') ||
        summary?.suggestedDoctorName ||
        summary?.consultants?.[0] ||
        '';
    const admissionDt = summary?.admissionDate ? format(new Date(summary.admissionDate), 'dd-MMM-yyyy hh:mm a') : '';
    const dischargeType = summary?.status === 'Discharged' ? 'Regular' : '';
    const org = summary?.organization || '';
    const dischargeDtTm = summary?.status === 'Discharged' ? format(new Date(summary.updatedAt || new Date()), 'dd-MMM-yyyy hh:mm a') : '';
    const patientType = summary?.type || summary?.admissionType || '';
    const paymentType = summary?.paymentMethod || 'Cash';
    const ward = bedItems.length > 0 ? bedItems[bedItems.length - 1].type : '';
    const bedNo = bedItems.length > 0 ? bedItems[bedItems.length - 1].bedId : '';
    const secondaryDr = doctor;
    const address = summary?.patientAddress || summary?.address || "";
    const phoneNo = summary?.patientContact || summary?.phone || "";
    const refDoctor = summary?.doctorReference || summary?.referredBy || summary?.patient?.doctorReference || summary?.patient?.profile?.doctorReference || summary?.patientProfile?.doctorReference || "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IP Interim Bill - ${patientName}</title>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #000; font-size: 10px; line-height: 1.3; }
            * { box-sizing: border-box; }
            
            /* Header */
            .header-table { width: 100%; text-align: center; margin-bottom: 5px; }
            .header-logo { max-height: 60px; width: auto; object-fit: contain; }
            .header-table h1 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .header-table p { margin: 2px 0; font-size: 10px; }
            
            .bill-title { text-align: center; font-size: 12px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; margin-bottom: 2px; }

            /* Patient Info Container - Clean Grid Layout */
            .patient-info-container {
                display: flex;
                width: 100%;
                border: 1px solid #000;
                margin-top: 5px;
                margin-bottom: 5px;
                background: #fff;
            }
            .info-group {
                flex: 1;
                padding: 6px 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .info-group:first-child {
                border-right: 1px solid #000;
            }
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                font-size: 10px;
                line-height: 1.4;
            }
            .info-label {
                color: #475569;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 8.5px;
                letter-spacing: 0.3px;
                width: 40%;
                text-align: left;
            }
            .info-value {
                color: #0f172a;
                font-weight: bold;
                text-align: right;
                width: 60%;
                word-wrap: break-word;
            }

            /* Main Services Table */
            table.main-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                border: 1px solid #000;
                font-size: 10px;
                table-layout: fixed;
            }
            table.main-table th {
                border-bottom: 1px solid #000;
                padding: 5px 6px;
                font-weight: bold;
                background-color: #f8fafc;
                text-align: left;
            }
            table.main-table td {
                padding: 4px 6px;
                vertical-align: middle;
            }
            table.main-table tr:not(:last-child) td {
                border-bottom: 1px solid #e2e8f0;
            }
            table.main-table th.right, table.main-table td.right { text-align: right; }

            .cat-header {
                color: #0000cd;
                font-weight: bold;
                text-transform: uppercase;
                padding: 6px 6px 4px 6px;
                font-size: 9.5px;
                background-color: #f1f5f9;
                border-bottom: 1px solid #cbd5e1;
            }
            .cat-subtotal {
                font-weight: bold;
                color: #0000cd;
                background-color: #f8fafc;
            }
            .cat-subtotal td {
                padding: 4px 6px;
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
            }

            /* Financial Summary Card (Totals & Deposits) */
            .financial-summary-container {
                display: flex;
                width: 100%;
                border: 1px solid #000;
                margin-top: 10px;
                background: #fff;
            }
            .summary-left {
                width: 65%;
                padding: 8px 12px;
                border-right: 1px solid #000;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .summary-right {
                width: 35%;
                padding: 8px 12px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            /* Inner Deposits Ledger */
            table.receipt-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 9px;
                margin-top: 4px;
                border: 1px solid #cbd5e1;
            }
            table.receipt-table th {
                background-color: #f8fafc;
                border-bottom: 1px solid #cbd5e1;
                text-align: left;
                padding: 3px 6px;
                font-weight: bold;
            }
            table.receipt-table td {
                padding: 3px 6px;
                border-bottom: 1px solid #f1f5f9;
            }
            table.receipt-table tr.receipt-total td {
                font-weight: bold;
                border-top: 1px solid #cbd5e1;
                border-bottom: none;
                background-color: #f8fafc;
            }

            /* Totals Grid Alignment */
            .totals-grid {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .totals-row {
                display: flex;
                justify-content: space-between;
                font-size: 9.5px;
                font-weight: bold;
            }
            .totals-row.balance-due {
                color: #b91c1c;
                font-size: 10.5px;
                border-top: 1px solid #000;
                padding-top: 4px;
                margin-top: 2px;
            }
            .totals-label {
                color: #475569;
            }
            .totals-value {
                color: #0f172a;
            }

            .sign-table { width: 100%; margin-top: 30px; font-weight: bold; font-size: 10px; text-align: center; border-collapse: collapse; }
            .print-time { font-size: 9px; font-weight: bold; margin-top: 10px; }
            
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                ${!require('@/stores/printStore').usePrintStore.getState().printWithHeader ? `
                .header-table { display: none !important; }
                ` : ''}
            }
        </style>
    </head>
    <body>
        <table class="header-table">
            <tr>
                <td style="width: 20%; text-align: left;">
                    ${hospitalDetails?.logo ? `<img src="${hospitalDetails.logo}" class="header-logo" />` : ''}
                </td>
                <td style="width: 60%; text-align: center;">
                    <h1>${hospitalDetails?.name || ''}</h1>
                    ${hospitalDetails?.address ? `<p>${hospitalDetails.address}</p>` : ''}
                    ${hospitalDetails?.phone || hospitalDetails?.contact ? `<p>Phone: ${hospitalDetails.phone || hospitalDetails.contact}</p>` : ''}
                    ${hospitalDetails?.email ? `<p>Email: ${hospitalDetails.email}</p>` : ''}
                </td>
                <td style="width: 20%;"></td>
            </tr>
        </table>
        
        <div class="bill-title">${summary?.isBillLocked ? `IP Final Bill - Detailed (Locked: ${summary.billLockedAt ? format(new Date(summary.billLockedAt), 'dd-MMM-yyyy hh:mm a') : 'Finalized'})` : (isSummary ? 'IP Interim Bill - Summary' : 'IP Bill - Detailed')}</div>

        <div class="patient-info-container">
            <div class="info-group">
                <div class="info-item">
                    <span class="info-label">Patient Name:</span>
                    <span class="info-value">${patientName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Age/Sex:</span>
                    <span class="info-value">${ageSex || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Doctor:</span>
                    <span class="info-value">${formatDoctorName(doctor || 'N/A')}</span>
                </div>
                ${secondaryDr ? `
                <div class="info-item">
                    <span class="info-label">Secondary Dr:</span>
                    <span class="info-value">${secondaryDr}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="info-label">Admission Dt:</span>
                    <span class="info-value">${admissionDt || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ward / Bed:</span>
                    <span class="info-value">${ward || 'N/A'}${bedNo ? ` / ${bedNo}` : ''}</span>
                </div>
                ${address ? `
                <div class="info-item">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${address}</span>
                </div>
                ` : ''}
                ${refDoctor ? `
                <div class="info-item">
                    <span class="info-label">Referal By:</span>
                    <span class="info-value">${refDoctor}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="info-group">
                <div class="info-item">
                    <span class="info-label">IP No:</span>
                    <span class="info-value">${ipNo}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">UMR No:</span>
                    <span class="info-value">${umrNo || 'N/A'}</span>
                </div>
                ${billNo ? `
                <div class="info-item">
                    <span class="info-label">Bill No:</span>
                    <span class="info-value">${billNo}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="info-label">Bill Date:</span>
                    <span class="info-value">${billDt}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Patient Type:</span>
                    <span class="info-value">${patientType}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Payment Type:</span>
                    <span class="info-value">${paymentType}</span>
                </div>
                ${phoneNo ? `
                <div class="info-item">
                    <span class="info-label">Phone No:</span>
                    <span class="info-value">${phoneNo}</span>
                </div>
                ` : ''}
                ${gstNo ? `
                <div class="info-item">
                    <span class="info-label">GST No:</span>
                    <span class="info-value">${gstNo}</span>
                </div>
                ` : ''}
                ${org ? `
                <div class="info-item">
                    <span class="info-label">Organization:</span>
                    <span class="info-value">${org}</span>
                </div>
                ` : ''}
                ${dischargeDtTm || dischargeType ? `
                <div class="info-item">
                    <span class="info-label">Discharge Dt:</span>
                    <span class="info-value">${dischargeDtTm} (${dischargeType})</span>
                </div>
                ` : ''}
            </div>
        </div>

        <table class="main-table">
            <thead>
                <tr>
                    <th style="width: 5%;">S.No</th>
                    <th style="width: 15%;">Code</th>
                    <th style="width: 40%;">Service Name</th>
                    <th class="right" style="width: 15%;">Rate</th>
                    <th class="right" style="width: 10%;">Qty</th>
                    <th class="right" style="width: 15%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${isSummary ? `
                    ${activeCategories.map((cat: any, idx: number) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>-</td>
                            <td style="font-weight: bold; color: #1e293b;">${cat.name}</td>
                            <td class="right"></td>
                            <td class="right"></td>
                            <td class="right" style="font-weight: bold; color: #1e293b;">${Number(cat.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `).join('')}
                ` : `
                    ${activeCategories.map((cat: any) => `
                        <tr>
                            <td colspan="6" class="cat-header">${cat.name}</td>
                        </tr>
                        ${cat.items.map((item: any, idx: number) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${item.code}</td>
                                <td>${item.name}</td>
                                <td class="right">${Number(item.rate).toFixed(2)}</td>
                                <td class="right">${Number(item.qty).toFixed(2)}</td>
                                <td class="right">${Number(item.amount).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="cat-subtotal">
                            <td colspan="4"></td>
                            <td class="right" style="border-top: 1px solid #000; border-bottom: 1px solid #000;">Sub Total :</td>
                            <td class="right" style="border-top: 1px solid #000; border-bottom: 1px solid #000;">${Number(cat.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `).join('')}
                `}
            </tbody>
        </table>
        
        <div class="financial-summary-container">
            <div class="summary-left">
                <div style="font-weight: bold; font-size: 10px; color: #0f172a;">Rupees In Words: <span style="font-weight: 800; color: #1e293b;">${numberToWords(Math.max(0, netBill))} Rupees Only</span></div>
                
                ${advanceItems.length > 0 ? `
                <div style="margin-top: 2px;">
                    <div style="font-weight: bold; font-size: 9px; color: #475569; text-transform: uppercase; letter-spacing: 0.3px;">Receipt Details:</div>
                    <table class="receipt-table">
                        <thead>
                            <tr>
                                <th style="width: 8%;">S.No</th>
                                <th style="width: 25%;">Record Date</th>
                                <th style="width: 27%;">Receipt No</th>
                                <th class="right" style="width: 25%;">Amount Paid</th>
                                <th style="width: 15%;">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${advanceItems.map((adv: any, i: number) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${format(new Date(adv.date), 'dd-MMM-yyyy')}</td>
                                    <td>${adv.reference || 'REC' + Math.floor(Math.random() * 900000 + 100000)}</td>
                                    <td class="right">${Number(adv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${adv.mode})</td>
                                    <td>${adv.transactionType}</td>
                                </tr>
                            `).join('')}
                            <tr class="receipt-total">
                                <td colspan="3" class="right">Total Deposits:</td>
                                <td class="right">${Number(totalDeposits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}
            </div>
            <div class="summary-right">
                <div class="totals-grid">
                    <div class="totals-row">
                        <span class="totals-label">Grand Total:</span>
                        <span class="totals-value">${Number(totalCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    ${discount > 0 ? `
                    <div class="totals-row">
                        <span class="totals-label">Discount:</span>
                        <span class="totals-value">-${Number(discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    ` : ''}
                    <div class="totals-row">
                        <span class="totals-label">Net Amount:</span>
                        <span class="totals-value">${Number(netBill).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">Paid Amount:</span>
                        <span class="totals-value">${Number(totalDeposits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row balance-due">
                        <span class="totals-label">Balance Due:</span>
                        <span class="totals-value">${Number(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <table class="sign-table">
            <tr>
                <td style="width: 33%; text-align: left;">
                    <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; margin: 0 auto;">Patient/Attendant Signatory</div>
                </td>
                <td style="width: 34%;"></td>
                <td style="width: 33%; text-align: right;">
                    <div style="width: 200px; margin: 0 auto;">
                        <div style="font-size: 10px; min-height: 12px; margin-bottom: 2px;">
                            ${doctor ? formatDoctorName(doctor) : '&nbsp;'}
                        </div>
                        <div style="border-top: 1px solid #000; padding-top: 5px;">Authorised Signatory</div>
                    </div>
                </td>
            </tr>
        </table>
        
        <div class="print-time">Printed Dt & Time : ${format(new Date(), 'dd-MMM-yyyy hh:mm a')}</div>

        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};
