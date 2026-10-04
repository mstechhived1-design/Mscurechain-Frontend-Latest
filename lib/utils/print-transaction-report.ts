import { formatPatientNameWithPrefix, formatDoctorName, formatPatientDisplayName } from '@/lib/utils/name-utils';
import { calculateExactAge } from '@/lib/utils/date-utils';

export const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Only";
    const safeNum = Math.round(Math.abs(Number(num) || 0));
    if (safeNum === 0) return "Zero Only";

    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
      "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
    ];
    const b = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const inWords = (n: any): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + "Hundred " + (n % 100 !== 0 ? "and " + inWords(n % 100) : "");
      if (n < 100000) return inWords(Math.floor(n / 1000)) + "Thousand " + (n % 1000 !== 0 ? inWords(n % 1000) : "");
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + "Lakh " + (n % 100000 !== 0 ? inWords(n % 100000) : "");
      return inWords(Math.floor(n / 10000000)) + "Crore " + (n % 10000000 !== 0 ? inWords(n % 10000000) : "");
    };

    const words = inWords(safeNum).trim() + " Rupees Only";
    return num < 0 ? "Minus " + words : words;
};

const formatDate = (d: any) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Format: 27-Apr-2026 19:30
    return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const generateTransactionReportHTML = (
    hospital: any,
    patient: any,
    admission: any,
    reportData: any,
    totals: any,
    printConfig: any
) => {
    const fmt = (num: number) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Generate Invoice/Bill No (Fallback if not provided)
    const invoiceNo = `K-PRB${new Date().getTime().toString().slice(-8)}`;
    
    const doctorCharge = reportData?.doctors?.length > 0 ? reportData.doctors[0] : null;
    let fallbackDoctor = doctorCharge?.doctorName || doctorCharge?.serviceName || '';
    if (fallbackDoctor.toLowerCase().includes('consultation')) fallbackDoctor = fallbackDoctor.replace(/consultation/i, '').trim();
    
    if (!fallbackDoctor) {
        fallbackDoctor = patient?.activeConsultation?.doctor?.user?.name || patient?.lastVisit?.doctor?.user?.name || '';
    }

    const wardCharge = reportData?.admissions?.length > 0 ? reportData.admissions[reportData.admissions.length - 1] : null;
    let fallbackBed = '';
    let fallbackWard = '';
    if (wardCharge?.chargeType) {
        // e.g., "Ward Charges - Bed B-E1-04 (EMERGENCY)"
        const match = wardCharge.chargeType.match(/Bed\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (match) {
            fallbackBed = match[1];
            fallbackWard = match[2];
        } else {
            fallbackWard = wardCharge.chargeType;
        }
    }

    const umrNo = patient?.mrn || patient?.user?.mrn || patient?.profile?.mrn || patient?.umr || patient?.patientId || patient?.user?._id || patient?._id || '';
    const phoneNo = patient?.mobile || patient?.user?.mobile || patient?.profile?.contactNumber || patient?.profile?.phone || patient?.phone || patient?.patientDetails?.phone || '';

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${(!admission || Object.keys(admission).length === 0) ? 'OP Interim' : (admission?.status === 'Discharged' ? 'IP Final' : 'IP Interim')} Bill - Detailed</title>
        <style>
            @page {
                size: A4;
                margin: 10mm 15mm;
                @bottom-right {
                    content: "Page " counter(page) " of " counter(pages);
                }
            }
            body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; color: #000; }
            
            .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 10px; }
            .hospital-name { font-size: 20px; font-weight: bold; color: #000080; text-align: center; text-transform: uppercase; margin: 0 0 5px 0; }
            .hospital-address { font-size: 11px; text-align: center; margin: 0 0 3px 0; }
            .hospital-contact { font-size: 11px; text-align: center; margin: 0 0 10px 0; }
            
            .title-bar { 
                text-align: center; 
                border-top: 2px solid #000; 
                border-bottom: 2px solid #000; 
                padding: 4px 0; 
                font-weight: bold; 
                font-size: 13px;
                background-color: #f8f8f8;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .subtitle-bar {
                text-align: center;
                border-bottom: 1px solid #000;
                padding: 3px 0;
                font-weight: bold;
                font-size: 13px;
                background-color: #f8f8f8;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .info-grid { width: 100%; border-bottom: 1px solid #000; font-size: 11px; padding: 4px 0; }
            .info-grid td { vertical-align: top; padding: 1px; }
            .info-label { width: 120px; }
            
            .data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
            .data-table th { 
                border-top: 1px solid #000; 
                border-bottom: 1px solid #000; 
                padding: 4px; 
                text-align: left;
                font-weight: bold;
            }
            .data-table th.right { text-align: right; }
            .data-table td { padding: 3px 4px; vertical-align: top; }
            .data-table td.right { text-align: right; }
            .data-table td.center { text-align: center; }
            
            .cat-header { 
                font-weight: bold; 
                color: #000080; /* Dark blue from reference */
                padding-top: 8px !important;
                padding-bottom: 4px !important;
            }
            .subtotal-row { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; }
            .subtotal-row td { padding: 4px; }
            
            .summary-section { margin-top: 10px; width: 100%; border-top: 2px solid #000; padding-top: 10px; display: flex; justify-content: space-between; }
            .words { font-weight: bold; width: 60%; }
            .totals-box { width: 35%; }
            .totals-box table { width: 100%; border-collapse: collapse; font-size: 11px; font-weight: bold; }
            .totals-box table td { padding: 3px; }
            .totals-box table td:last-child { text-align: right; }
            
            .receipt-section { margin-top: 15px; width: 100%; }
            .receipt-section h4 { margin: 0 0 5px 0; font-size: 12px; font-weight: bold; }
            
            .footer { margin-top: 60px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
            .footer-bottom { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; }
        </style>
    </head>
    <body>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px;">
            <div style="width: 25%; text-align: left;">
                ${hospital.logo ? `<img src="${hospital.logo}" style="max-height: 80px; max-width: 100%;" />` : ''}
            </div>
            <div style="width: 50%; text-align: center;">
                <h1 class="hospital-name">${hospital?.name || 'HOSPITAL NAME'}</h1>
                <p class="hospital-address">${hospital?.address || ''}</p>
                <p class="hospital-contact">Phone: ${hospital?.phone || ''}</p>
            </div>
            <div style="width: 25%;"></div>
        </div>
        
        <div class="title-bar">${(!admission || Object.keys(admission).length === 0) ? 'OP Interim Bill-Detailed' : (admission?.status === 'Discharged' ? 'IP Final Bill - Detailed' : 'IP Interim Bill-Detailed')}</div>
        <div class="subtitle-bar">BILL OF SUPPLY / INVOICE NO : ${invoiceNo}</div>
        
        <table class="info-grid">
            <tr>
                <td style="width: 50%;">
                    <table style="width: 100%; border: none;">
                        <tr><td class="info-label">CIN No</td><td>: ${hospital?.cinNumber || hospital?.cin || ''}</td></tr>
                        <tr><td class="info-label">Patient Name</td><td>: <b>${formatPatientDisplayName(patient)}</b></td></tr>
                        <tr><td class="info-label">Age/Sex</td><td>: ${(() => {
                            const patientDob = patient?.dob || patient?.profile?.dob || patient?.patientDetails?.dob || patient?.dateOfBirth || patient?.user?.dateOfBirth;
                            const encounterDate = admission?.admissionDate || admission?.createdAt || reportData?.date || new Date();
                            const ageCalc = calculateExactAge(patientDob, new Date(encounterDate));
                            const ageText = ageCalc.display !== "N/A"
                                ? (ageCalc.years >= 2 ? `${ageCalc.years} Y` : ageCalc.shortDisplay)
                                : (patient?.age || patient?.profile?.age ? `${patient?.age || patient?.profile?.age} Y` : '');
                            const genderText = patient?.gender || patient?.profile?.gender || patient?.patientDetails?.gender || patient?.user?.gender
                                ? (patient?.gender || patient?.profile?.gender || patient?.patientDetails?.gender || patient?.user?.gender).charAt(0).toUpperCase() + (patient?.gender || patient?.profile?.gender || patient?.patientDetails?.gender || patient?.user?.gender).slice(1)
                                : '';
                            return [ageText, genderText].filter(Boolean).join(' / ') || 'N/A';
                        })()}</td></tr>
                        <tr><td class="info-label">S/W/D</td><td>: ${patient?.profile?.GuardianName || patient?.profile?.guardianName || patient?.user?.guardianName || patient?.user?.GuardianName || patient?.guardianName || patient?.caregiverName || patient?.patientDetails?.guardianName || patient?.patientDetails?.GuardianName || ''}</td></tr>
                        <tr><td class="info-label">Doctor</td><td>: ${formatDoctorName(admission?.doctorName || admission?.doctor?.name || fallbackDoctor || '')}</td></tr>
                        ${admission?.admissionDate ? `<tr><td class="info-label">Admission Dt</td><td>: ${formatDate(admission?.admissionDate)}</td></tr>` : ''}
                        <tr><td class="info-label">Organization</td><td>: ${admission?.organization || admission?.sponsorName || ''}</td></tr>
                        <tr><td class="info-label">Patient Type</td><td>: ${(!admission || !reportData?.admissions?.length) ? 'OP Patient' : (admission?.type || admission?.admissionType || 'IPD')}</td></tr>
                        <tr><td class="info-label">Secondary Dr.</td><td>: ${admission?.secondaryDoctor?.name || admission?.secondaryDoctorName || ''}</td></tr>
                        <tr><td class="info-label">Address</td><td>: ${patient?.address || patient?.patientAddress || patient?.patientDetails?.address || patient?.profile?.address || ''}</td></tr>
                        <tr><td class="info-label">Referal By</td><td>: ${
                            admission?.doctorReference || 
                            admission?.referredBy || 
                            admission?.admissionInfo?.doctorReference ||
                            admission?.admissionInfo?.referredBy ||
                            patient?.doctorReference || 
                            patient?.referredBy || 
                            patient?.profile?.doctorReference || 
                            patient?.profile?.referredBy || 
                            patient?.patientDetails?.doctorReference ||
                            patient?.patientDetails?.referredBy ||
                            patient?.lastVisit?.doctorReference || 
                            patient?.lastVisit?.patientDetails?.doctorReference ||
                            patient?.user?.doctorReference ||
                            patient?.patientInfo?.doctorReference ||
                            patient?.patientInfo?.referredBy ||
                            reportData?.doctorReference ||
                            reportData?.referredBy ||
                            ''
                        }</td></tr>
                    </table>
                </td>
                <td style="width: 50%;">
                    <table style="width: 100%; border: none;">
                        <tr><td class="info-label">GST No</td><td>: ${hospital?.gstNumber || hospital?.gst || ''}</td></tr>
                        ${admission?.admissionId ? `<tr><td class="info-label">IP No</td><td>: ${admission?.admissionId}</td></tr>` : ''}
                        <tr><td class="info-label">UMR No</td><td>: ${umrNo}</td></tr>
                        <tr><td class="info-label">Bill No</td><td>: ${invoiceNo}</td></tr>
                        <tr><td class="info-label">Bill Dt</td><td>: ${formatDate(new Date())}</td></tr>
                        ${(admission?.status === 'Discharged' && admission?.dischargeDate) ? `
                        <tr><td class="info-label">Discharge Type</td><td>: ${admission?.dischargeType || 'Regular'}</td></tr>
                        <tr><td class="info-label">Discharge Dt</td><td>: ${formatDate(admission.dischargeDate)}</td></tr>
                        ` : ''}
                        ${(admission?.wardName || admission?.ward?.name || admission?.bed?.wardName || admission?.bed?.type || fallbackWard) ? `<tr><td class="info-label">Ward</td><td>: ${admission?.wardName || admission?.ward?.name || admission?.bed?.wardName || admission?.bed?.type || fallbackWard}</td></tr>` : ''}
                        ${(admission?.bedNumber || admission?.bed?.bedId || admission?.bed?.number || admission?.bedId || fallbackBed) ? `<tr><td class="info-label">Bed No</td><td>: ${admission?.bedNumber || admission?.bed?.bedId || admission?.bed?.number || admission?.bedId || fallbackBed}</td></tr>` : ''}
                        <tr><td class="info-label">Phone No</td><td>: ${phoneNo}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%">S.No</th>
                    <th style="width: 15%">Code</th>
                    <th style="width: 45%">Service Name</th>
                    <th class="right" style="width: 10%">Rate</th>
                    <th class="right" style="width: 10%">Qty</th>
                    <th class="right" style="width: 15%">Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Render logic for categories
    const sNo = 1;

    const cleanStr = (val: any, fallback: string = ''): string => {
        if (!val) return fallback;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed === '[object Object]' || trimmed === 'object Object') return fallback;
            return trimmed;
        }
        if (typeof val === 'object') {
            return (
                cleanStr(val.testName) ||
                cleanStr(val.name) ||
                cleanStr(val.title) ||
                cleanStr(val.description) ||
                cleanStr(val.serviceName) ||
                cleanStr(val.medicineName) ||
                cleanStr(val.doctorName) ||
                cleanStr(val.chargeType) ||
                fallback
            );
        }
        return String(val);
    };

    const renderRows = (items: any[], title: string) => {
        if (!items || items.length === 0) return '';
        let rowHtml = `<tr><td colspan="6" class="cat-header">${title}</td></tr>`;
        let subtotal = 0;
        
        items.forEach((item, idx) => {
            const amount = item.amount || (item.rate * (item.quantity || item.visits || item.days || 1));
            subtotal += amount;
            const rawName = title.toLowerCase().includes('consultation')
                ? (item.serviceName || item.doctorName || 'Doctor Consultation')
                : (item.testName || item.serviceName || item.doctorName || item.chargeType || item.medicineName || item.description || 'Service');
            const displayName = title.toLowerCase().includes('consultation')
                ? formatDoctorName(cleanStr(rawName, 'Doctor Consultation'))
                : cleanStr(rawName, 'Service');

            let itemCode = cleanStr(item.code || item.serviceCode || item.testCode || item.itemCode || '');
            if (!itemCode) {
                const prefix = title.toLowerCase().includes('consultation') ? 'SVC'
                    : title.toLowerCase().includes('investigation') ? 'LAB'
                    : title.toLowerCase().includes('ward') ? 'BED'
                    : title.toLowerCase().includes('radiology') ? 'RAD'
                    : title.toLowerCase().includes('pharmacy') ? 'MED'
                    : 'SVC';
                const idSuffix = item._id ? item._id.toString().slice(-6).toUpperCase()
                    : (item.id && typeof item.id === 'string' && item.id.length >= 4) ? item.id.slice(-6).toUpperCase()
                    : `${idx + 1}`;
                itemCode = prefix === 'BED' ? `BED${idx + 1}` : `${prefix}${idSuffix}`;
            }

            rowHtml += `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${itemCode}</td>
                    <td>${displayName}</td>
                    <td class="right">${fmt(item.rate)}</td>
                    <td class="right">${fmt(item.quantity || item.visits || item.days || 1)}</td>
                    <td class="right">${fmt(amount)}</td>
                </tr>
            `;
        });
        
        rowHtml += `
            <tr class="subtotal-row">
                <td colspan="5" class="right">Sub Total :</td>
                <td class="right">${fmt(subtotal)}</td>
            </tr>
        `;
        return rowHtml;
    };

    const cfg = {
        consultations: printConfig?.consultations !== false,
        investigations: printConfig?.investigations !== false,
        wards: printConfig?.wards !== false,
        radiology: printConfig?.radiology !== false,
        services: printConfig?.services !== false,
        pharmacy: printConfig?.pharmacy !== false,
        receipts: printConfig?.receipts !== false,
    };

    if (cfg.consultations) html += renderRows(reportData.doctors, 'Consultation Charges');
    if (cfg.investigations) html += renderRows(reportData.diags, 'INVESTIGATION CHARGES');
    if (cfg.wards) html += renderRows(reportData.admissions, 'Ward Charges');
    
    // Add radiology if present and enabled
    if (cfg.radiology) {
        const rads = reportData.rads || [];
        html += renderRows(rads, 'Radiology Charges');
    }
    
    if (cfg.services) html += renderRows(reportData.services, 'SERVICE CHARGES');
    if (cfg.pharmacy) html += renderRows(reportData.meds, 'PHARMACY CHARGES');

    html += `
            </tbody>
        </table>
        
        <div class="summary-section">
            <div class="words">
                Rupees In : ${numberToWords(totals.balance > 0 ? totals.balance : (totals.grandTotal - (totals.discount || 0)))}
                <br/><br/>
                <span style="font-weight: normal;">Reason : </span>
            </div>
            <div class="totals-box">
                <table>
                    <tr><td>Grand Total :</td><td>${fmt(totals.grandTotal)}</td></tr>
                    ${(totals.discount && totals.discount > 0) ? `<tr style="color:#c0392b;"><td>(-) Discount / Adj. :</td><td>- ${fmt(totals.discount)}</td></tr>` : ''}
                    <tr style="font-weight:bold; border-top: 1px solid #333;"><td>After Discount :</td><td>${fmt(totals.grandTotal - (totals.discount || 0))}</td></tr>
                    <tr><td>(-) Paid Amt :</td><td>- ${fmt(totals.totalPaid)}</td></tr>
                    <tr style="font-weight:bold; border-top: 1px solid #333;"><td>Balance Amt :</td><td>${fmt(totals.balance)}</td></tr>
                </table>
            </div>
        </div>
    `;

    if (cfg.receipts && reportData.payments && reportData.payments.length > 0) {
        html += `
            <div class="receipt-section">
                <div style="border-bottom: 1px solid #000; font-weight: bold; margin-bottom: 5px;">Receipt Details :</div>
                <table class="data-table" style="margin-top: 0; border: none;">
                    <thead>
                        <tr style="border:none; border-bottom: 1px solid #000;">
                            <th style="border:none;">S.No</th>
                            <th style="border:none;">Record Date</th>
                            <th style="border:none;">Receipt No</th>
                            <th style="border:none;" class="right">Amount Payment</th>
                            <th style="border:none;">Type</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let receiptTotal = 0;
        reportData.payments.forEach((p: any, idx: number) => {
            if (!p.status || p.status === 'Paid' || p.status === 'Completed') {
                receiptTotal += Number(p.amount || 0);
                
                let modeText = p.mode || p.paymentMode || 'Advance';
                if (modeText.toLowerCase() === 'mixed' && p.paymentDetails) {
                    const details = [];
                    if (p.paymentDetails.cash) details.push(`Cash: ${fmt(p.paymentDetails.cash)}`);
                    if (p.paymentDetails.upi) details.push(`UPI: ${fmt(p.paymentDetails.upi)}`);
                    if (p.paymentDetails.card) details.push(`Card: ${fmt(p.paymentDetails.card)}`);
                    if (p.paymentDetails.bankTransfer) details.push(`Bank: ${fmt(p.paymentDetails.bankTransfer)}`);
                    if (details.length > 0) {
                        modeText = `Mixed (${details.join(', ')})`;
                    }
                }

                html += `
                    <tr>
                        <td class="center">${idx + 1}</td>
                        <td>${p.date || formatDate(new Date())}</td>
                        <td>${p.receiptNo || p.receiptNumber || '-'}</td>
                        <td class="right">${fmt(Number(p.amount || 0))}</td>
                        <td>${modeText}</td>
                    </tr>
                `;
            }
        });
        
        html += `
                    <tr class="subtotal-row">
                        <td colspan="3" class="right" style="border:none; border-top:1px solid #000; border-bottom:1px solid #000;">Total :</td>
                        <td class="right" style="border:none; border-top:1px solid #000; border-bottom:1px solid #000;">${fmt(receiptTotal)}</td>
                        <td style="border:none; border-top:1px solid #000; border-bottom:1px solid #000;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;
    }

    html += `
        <div style="margin-top: 30px; border-top: 1px solid #000; width: 40%; margin-left: 30%;"></div>
        
        <div class="footer">
            <div style="text-align: center;">Patient/Attendant Signatory</div>
            <div style="text-align: center;">
                <br/>
                Authorised Signatory
            </div>
        </div>
        
        <div class="footer-bottom">
            <div>Printed Dt & Time : ${formatDate(new Date())}</div>
        </div>
    </body>
    </html>
    `;

    return html;
};
