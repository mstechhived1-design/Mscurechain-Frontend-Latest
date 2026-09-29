import { format } from "date-fns";
import { usePrintStore } from '@/stores/printStore';
import { cleanDoctorName, formatPatientNameWithPrefix } from '@/lib/utils/name-utils';

function numberToWords(num: number): string {
    const a = [
        "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ",
        "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if ((num = num.toString().replace(/[\, ]/g, "") as any) != parseFloat(num as any)) return "Not a Number";
    let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += n[1] != "00" ? (a[Number(n[1])] || b[n[1][0] as any] + " " + a[n[1][1] as any]) + "Crore " : "";
    str += n[2] != "00" ? (a[Number(n[2])] || b[n[2][0] as any] + " " + a[n[2][1] as any]) + "Lakh " : "";
    str += n[3] != "00" ? (a[Number(n[3])] || b[n[3][0] as any] + " " + a[n[3][1] as any]) + "Thousand " : "";
    str += n[4] != "0" ? (a[Number(n[4])] || b[n[4][0] as any] + " " + a[n[4][1] as any]) + "Hundred " : "";
    str += n[5] != "00" ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0] as any] + " " + a[n[5][1] as any]) : "";
    return str.trim();
}

export const printPaymentReceipt = (payment: any, summary: any, hospitalDetails?: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printWithHeader = usePrintStore.getState().printWithHeader;

    const txDate = payment.createdAt || payment.transactionTime || payment.date || new Date();
    const receiptDate = format(new Date(txDate), 'dd-MMM-yyyy hh:mm a');
    const amountInWords = numberToWords(Math.round(payment.amount)) + "Only";

    const patientName = formatPatientNameWithPrefix(
        summary?.patientName || payment?.patientName || "Unknown Patient",
        summary?.patientHonorific || summary?.patientPrefix || summary?.honorific || payment?.honorific
    );
    const rawAge = summary?.patientAge || summary?.age || payment?.patientAge || payment?.age || "";
    const rawAgeUnit = summary?.patientAgeUnit || summary?.ageUnit || payment?.patientAgeUnit || payment?.ageUnit || "Y";
    const rawGender = summary?.patientGender || summary?.gender || payment?.patientGender || payment?.gender || "";
    
    let formattedAge = '';
    if (rawAge) {
        if (/[a-zA-Z]/.test(rawAge.toString())) {
            formattedAge = rawAge.toString();
        } else {
            let unitStr = 'Y';
            const unitLower = rawAgeUnit.toString().toLowerCase();
            if (unitLower.startsWith('m')) unitStr = ' Mos';
            else if (unitLower.startsWith('d')) unitStr = 'D';
            
            formattedAge = `${rawAge}${unitStr}`;
        }
    }

    const ageGender = [formattedAge, rawGender].filter(Boolean).join(" / ") || "N/A";

    let docNameRaw = payment?.referringDoctor || payment?.doctorName || summary?.referringDoctor || summary?.doctorName || summary?.consultantName || summary?.prescribingDoctor || summary?.referredBy || summary?.primaryDoctor || '';
    if (typeof docNameRaw === 'object' && docNameRaw !== null && (docNameRaw as any).name) {
        docNameRaw = (docNameRaw as any).name;
    }
    const isValidDoctor = typeof docNameRaw === 'string' && docNameRaw.trim() !== '' && docNameRaw.trim() !== '-' && docNameRaw.toLowerCase() !== 'n/a' && docNameRaw.toLowerCase() !== 'no doctor (self / walk-in)' && !/^[a-f0-9]{24}$/i.test(docNameRaw);

    const doctorPrefix = summary?.doctorObj?.prefix ? `${summary.doctorObj.prefix}. ` : 'Dr. ';
    const doctorName = isValidDoctor ? `${doctorPrefix}${cleanDoctorName(docNameRaw)}` : "N/A";

    const hospitalLogo = hospitalDetails?.logo || '';
    const hospitalName = hospitalDetails?.name || 'HOSPITAL NAME';
    const hospitalAddress = hospitalDetails?.address || '';
    const hospitalPhone = hospitalDetails?.phone || '';

    const htmlContent = `
        <html>
        <head>
            <title>Payment Receipt - ${payment.reference || 'Receipt'}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #fff;
                    color: #000;
                }
                .container { width: 100%; max-width: 800px; margin: 0 auto; }
                .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .hospital-logo { max-width: 100px; max-height: 80px; }
                .hospital-info { text-align: right; }
                .hospital-name { font-size: 20px; font-weight: bold; margin: 0; }
                .hospital-details { font-size: 12px; margin: 5px 0 0; }
                .receipt-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; text-decoration: underline; text-transform: uppercase; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
                .info-table td { padding: 5px; vertical-align: top; }
                .info-table .label { font-weight: bold; width: 120px; }
                .details-box { border: 1px solid #000; padding: 20px; margin-bottom: 30px; border-radius: 8px; }
                .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                .amount-large { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 15px 0; }
                .words { font-style: italic; font-size: 13px; text-align: center; }
                .footer-sig { display: flex; justify-content: space-between; margin-top: 60px; font-size: 12px; font-weight: bold; }
                .sig-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
                .print-time { font-size: 10px; text-align: left; margin-top: 20px; color: #555; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    ${!printWithHeader ? '.header-container { display: none !important; }' : ''}

                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header-container">
                    <div>
                        ${hospitalLogo ? `<img src="${hospitalLogo}" class="hospital-logo" />` : ''}
                    </div>
                    <div class="hospital-info">
                        <h1 class="hospital-name">${hospitalName}</h1>
                        <p class="hospital-details">${hospitalAddress}<br/>Ph: ${hospitalPhone}</p>
                    </div>
                </div>

                <div class="receipt-title">${payment.transactionType === 'Refund' ? 'REFUND RECEIPT' : 'PAYMENT RECEIPT'}</div>

                <table class="info-table">
                    <tr>
                        <td class="label">Patient Name:</td>
                        <td>${patientName}</td>
                        <td class="label">Receipt Date:</td>
                        <td>${receiptDate}</td>
                    </tr>
                    <tr>
                        <td class="label">Age/Sex:</td>
                        <td>${ageGender}</td>
                        <td class="label">Admission ID:</td>
                        <td>${summary?.admissionId || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label">Consultant:</td>
                        <td>${doctorName}</td>
                        <td class="label">Receipt No / Ref:</td>
                        <td>${payment.reference || 'N/A'}</td>
                    </tr>
                </table>

                <div class="details-box">
                    <div class="details-row">
                        <span style="font-weight: bold;">Transaction Type:</span>
                        <span>${payment.transactionType || 'Payment'}</span>
                    </div>
                    <div class="details-row">
                        <span style="font-weight: bold;">Payment Mode:</span>
                        <span>${payment.mode || 'Cash'}</span>
                    </div>
                    <div class="details-row">
                        <span style="font-weight: bold;">Processed By:</span>
                        <span>Helpdesk</span>
                    </div>
                    
                    <div class="amount-large">
                        ${payment.transactionType === 'Refund' ? 'REFUNDED' : 'RECEIVED'}: ₹ ${payment.amount.toLocaleString()}
                    </div>
                    
                    <div class="words">
                        Rupees ${amountInWords}
                    </div>
                </div>

                <div class="footer-sig">
                    <div>
                        <div class="sig-line">Patient / Attendant Signature</div>
                    </div>
                    <div>
                        <div class="sig-line">Authorized Signatory</div>
                    </div>
                </div>

                <div class="print-time">Printed On: ${format(new Date(), 'dd-MMM-yyyy hh:mm a')}</div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};