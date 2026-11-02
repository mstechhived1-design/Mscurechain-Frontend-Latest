import { usePrintStore } from '@/stores/printStore';
import { formatDoctorName, formatPatientNameWithPrefix } from '@/lib/utils/name-utils';
import { formatFrequency } from '@/lib/frequencyUtils';


/**
 * Safely parses any date string, Date object, or timestamp without throwing or producing Invalid Date.
 * Properly handles Indian/UK DD/MM/YYYY and DD-MM-YYYY formats which standard new Date() fails on when Day > 12.
 */
export const parseSafeDate = (input: any): Date | null => {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (
      !trimmed ||
      trimmed === '-' ||
      trimmed.toLowerCase() === 'n/a' ||
      trimmed.toLowerCase() === 'invalid date' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return null;
    }

    // 1. Check DD/MM/YYYY or DD-MM-YYYY (e.g. "24/10/2026", "24-10-2026", "05/03/2025")
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const timePart = ddmmyyyyMatch[4]?.trim();
      const d = new Date(year, month, day);

      if (timePart) {
        const cleanTime = timePart.replace(/^,?\s*/, '');
        const timeParsed = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${cleanTime}`);
        if (!isNaN(timeParsed.getTime())) return timeParsed;
      }

      if (!isNaN(d.getTime())) return d;
    }

    // 2. Check YYYY-MM-DD or YYYY/MM/DD (e.g. "2026-10-24", "2026/10/24")
    const yyyymmddMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(.*)$/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1], 10);
      const month = parseInt(yyyymmddMatch[2], 10) - 1;
      const day = parseInt(yyyymmddMatch[3], 10);
      const timePart = yyyymmddMatch[4]?.trim();
      const d = new Date(year, month, day);

      if (timePart) {
        const cleanTime = timePart.replace(/^[T,\s]+/, '');
        const timeParsed = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${cleanTime}`);
        if (!isNaN(timeParsed.getTime())) return timeParsed;
      }

      if (!isNaN(d.getTime())) return d;
    }

    // 3. Try standard Date parsing (e.g. ISO strings "2026-10-24T12:00:00Z", "24 Oct 2026", "October 24, 2026")
    const standardDate = new Date(trimmed);
    if (!isNaN(standardDate.getTime())) return standardDate;
  }
  return null;
};

export const formatSafeDate = (
  input: any,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
  fallback = new Date()
): string => {
  const d = parseSafeDate(input) || parseSafeDate(fallback) || new Date();
  return d.toLocaleDateString("en-GB", options);
};

export const formatSafeTime = (
  input: any,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true },
  fallback = new Date()
): string => {
  const d = parseSafeDate(input) || parseSafeDate(fallback) || new Date();
  return d.toLocaleTimeString("en-IN", options);
};

export const computeAgeFromDob = (dob: any, fallbackAge: any, fallbackUnit: any) => {
  if (dob) {
    const birthDate = parseSafeDate(dob);
    if (birthDate && !isNaN(birthDate.getTime())) {
      const today = new Date();
      let ageYears = today.getFullYear() - birthDate.getFullYear();
      let ageMonths = today.getMonth() - birthDate.getMonth();
      let ageDays = today.getDate() - birthDate.getDate();

      if (ageDays < 0) {
        ageMonths--;
        ageDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      }
      if (ageMonths < 0) {
        ageYears--;
        ageMonths += 12;
      }

      if (ageYears > 0) {
        if (ageMonths > 0 && ageYears < 5) {
          return `${ageYears} ${ageYears === 1 ? 'Year' : 'Years'} ${ageMonths} ${ageMonths === 1 ? 'Month' : 'Months'}`;
        }
        return `${ageYears} ${ageYears === 1 ? 'Year' : 'Years'}`;
      }
      if (ageMonths > 0) {
        return `${ageMonths} ${ageMonths === 1 ? 'Month' : 'Months'}`;
      }
      if (ageDays > 0) {
        return `${ageDays} ${ageDays === 1 ? 'Day' : 'Days'}`;
      }
      return "0 Days";
    }
  }
  if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== "-" && fallbackAge !== "" && fallbackAge !== "N/A") {
    const fallbackStr = String(fallbackAge).trim();
    // Normalize short format e.g. "1D", "19D", "2M", "5Y"
    const dMatch = fallbackStr.match(/^(\d+)\s*d(ays?)?$/i);
    if (dMatch) return `${dMatch[1]} ${dMatch[1] === '1' ? 'Day' : 'Days'}`;
    const mMatch = fallbackStr.match(/^(\d+)\s*m(os?|onths?)?$/i);
    if (mMatch) return `${mMatch[1]} ${mMatch[1] === '1' ? 'Month' : 'Months'}`;
    const yMatch = fallbackStr.match(/^(\d+)\s*y(rs?|ears?)?$/i);
    if (yMatch) return `${yMatch[1]} ${yMatch[1] === '1' ? 'Year' : 'Years'}`;

    const rawUnit = String(fallbackUnit || '').trim().toLowerCase();
    const unit = rawUnit.startsWith('d') ? (fallbackStr === '1' ? 'Day' : 'Days') :
                 rawUnit.startsWith('m') ? (fallbackStr === '1' ? 'Month' : 'Months') :
                 (fallbackStr === '1' ? 'Year' : 'Years');
                 
    if (fallbackStr.match(/(Y|Mos|Days|Month|Day|Yr|Yrs|Years|Months)$/i)) return fallbackStr;
    return `${fallbackAge} ${unit}`;
  }
  return "N/A";
};

export const formatTime12Hr = (time: any): string => {
  if (!time) return "N/A";
  if (
    typeof time === "string" &&
    (time.toUpperCase().includes("AM") || time.toUpperCase().includes("PM"))
  ) {
    return time.toUpperCase();
  }
  try {
    let date: Date;
    if (time instanceof Date) {
      date = time;
    } else if (typeof time === "string") {
      const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeMatch) {
        date = new Date();
        date.setHours(parseInt(timeMatch[1], 10));
        date.setMinutes(parseInt(timeMatch[2], 10));
        date.setSeconds(timeMatch[3] ? parseInt(timeMatch[3], 10) : 0);
      } else {
        date = new Date(time);
      }
    } else {
      date = new Date(time);
    }
    if (isNaN(date.getTime())) return String(time);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(time);
  }
};

export const formatReceiptPaymentMode = (payment: any = {}, appointment: any = {}): string => {
  const rawMode = String(payment?.method || payment?.mode || appointment?.paymentMethod || appointment?.paymentMode || 'CASH').toUpperCase();
  if (rawMode === 'MIXED') {
    const detailsObj = payment?.paymentDetails ||
      appointment?.payment?.paymentDetails ||
      appointment?.paymentDetails ||
      payment?.transaction?.paymentDetails ||
      appointment?.transaction?.paymentDetails ||
      {};
    const cash = Number(detailsObj.cash) || 0;
    const upi = Number(detailsObj.upi) || 0;
    const card = Number(detailsObj.card) || 0;
    const bank = Number(detailsObj.bankTransfer || detailsObj.bank) || 0;

    const parts: string[] = [];
    if (cash > 0) parts.push(`Cash: ₹${cash.toLocaleString('en-IN')}`);
    if (upi > 0) parts.push(`UPI: ₹${upi.toLocaleString('en-IN')}`);
    if (card > 0) parts.push(`Card: ₹${card.toLocaleString('en-IN')}`);
    if (bank > 0) parts.push(`Bank: ₹${bank.toLocaleString('en-IN')}`);

    if (parts.length > 0) {
      return `MIXED (${parts.join(', ')})`;
    }

    const paidAmt = Number(payment?.amount != null ? payment?.amount : (payment?.paidAmount || appointment?.amount || 0));
    if (paidAmt > 0) {
      return `MIXED (Paid: ₹${paidAmt.toLocaleString('en-IN')})`;
    }
  }
  return rawMode;
};

export const generatePayslipHtml = (data: any) => {
  const { payroll, hospital } = data;
  const staff = data.staff || payroll?.user || {};
  const rx = payroll || {};
  const u = staff;
  const h = hospital;
  const b = rx.breakdown || {};
  const c = rx.ctc || {};

  const totalGross =
    (b.basic || 0) +
    (b.hra || 0) +
    (b.transportAllowance || 0) +
    (b.medicalAllowance || 0) +
    (b.specialAllowance || 0) +
    (b.bonus || 0) +
    (b.salaryArrears || 0);
  const totalDeducts =
    (b.pf || 0) +
    (b.esi || 0) +
    (b.professionalTax || 0) +
    (b.tds || 0) +
    (b.salaryAdvance || 0);
  const netSalary = rx.netSalary || totalGross - totalDeducts;

  const monthName = rx.startDate
    ? new Date(rx.startDate).toLocaleString("default", {
      month: "short",
      year: "numeric",
    })
    : "Pay Period";
  const fullPeriod =
    rx.startDate && rx.endDate
      ? `(From ${((d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear())(new Date(rx.startDate))} To ${((d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear())(new Date(rx.endDate))})`
      : "";

  // Number to words function
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Only";
    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const inWords = (n: any): string => {
      if (n < 20) return a[n];
      if (n < 100)
        return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000)
        return (
          a[Math.floor(n / 100)] +
          "Hundred " +
          (n % 100 !== 0 ? "and " + inWords(n % 100) : "")
        );
      return "";
    };

    const convert = (n: number) => {
      let str = "";
      const crores = Math.floor(n / 10000000);
      n %= 10000000;
      if (crores > 0) str += inWords(crores) + "Crore ";

      const lakhs = Math.floor(n / 100000);
      n %= 100000;
      if (lakhs > 0) str += inWords(lakhs) + "Lakh ";

      const thousands = Math.floor(n / 1000);
      n %= 1000;
      if (thousands > 0) str += inWords(thousands) + "Thousand ";

      if (n > 0) str += inWords(n);
      return str.trim();
    };

    return convert(Math.floor(num)) + " Only";
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pay Slip - ${u.name || "Employee"}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #000;
          line-height: 1.3;
          margin: 0;
          padding: 0;
          background: white;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .container {
          width: 210mm;
          margin: 0 auto;
          padding: 8mm;
          box-sizing: border-box;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
        }
        .hospital-name {
          font-size: 22px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
        }
        .hospital-info {
          font-size: 11px;
          margin: 2px 0;
          color: #555;
        }
        .pay-slip-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 8px;
        }
        .pay-period {
          font-size: 12px;
          margin-top: 2px;
        }
        .section {
          border: 1px solid #000;
          margin-bottom: 8px;
        }
        .section-inner {
          padding: 6px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .info-row {
          display: flex;
          font-size: 10px;
          line-height: 1.2;
        }
        .info-label {
          width: 120px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .info-separator {
          width: 10px;
          flex-shrink: 0;
        }
        .info-value {
          font-weight: bold;
          flex: 1;
        }
        .table-section {
          border: 1px solid #000;
          margin-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 4px 6px;
          text-align: left;
          font-weight: bold;
          font-size: 10px;
          background: white;
        }
        td {
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 3px 6px;
          font-size: 10px;
        }
        .total-row {
          font-weight: bold;
          text-transform: uppercase;
          border-top: 1px solid #000;
        }
        .net-pay-row {
          font-weight: bold;
          border-top: 1px solid #000;
        }
        .net-pay-label {
          width: 60px;
        }
        .ctc-section {
          border: 1px solid #000;
          border-top: none;
        }
        .ctc-header {
          border-bottom: 1px solid #000;
          padding: 4px 6px;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
        }
        .ctc-table td {
          padding: 3px 6px;
        }
        .footer {
          margin-top: 6px;
          font-size: 7px;
          font-weight: bold;
        }
        .footer p {
          margin: 2px 0;
        }
        .signatory {
          margin-top: auto;
          border-top: 1px solid #000;
          padding-top: 6px;
          display: flex;
          justify-content: flex-end;
        }
        .signatory-box {
          text-align: center;
          width: 140px;
          border-top: 1px solid #000;
          padding-top: 4px;
        }
        .signatory-text {
          font-size: 8px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      </style>
      ${!usePrintStore.getState().printWithHeader ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
      </style>
      ` : ''}
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 1000);">
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 class="hospital-name">${h?.name || "Institutional Healthcare"}</h1>
          <p class="hospital-info">${h?.address || "Hospital Complex"}</p>
          <p class="hospital-info">Phone: ${h?.phone || "91-0000000000"} | Email: ${h?.email || "admin@hospital.com"}</p>
          <div class="pay-slip-title">Pay Slip For the Month of ${monthName}</div>
          <div class="pay-period">${fullPeriod}</div>
        </div>

        <!-- Employee Identity -->
        <div class="section">
          <div class="section-inner">
            <div class="info-grid">
              <div>
                <div class="info-row">
                  <span class="info-label">Employee Name</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.name || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Father's Name</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.fatherName || rx.fatherName || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">PAN</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.panNumber || rx.panNumber || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">PF A/c No</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.pfNumber || rx.pfNumber || "N.A."}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Branch</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.workLocation || rx.workLocation || "HYDERABAD"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Designation</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.designation || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Scale</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.scale || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Pay Mode</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${rx.paymentMethod?.replace("_", " ").toUpperCase() || "TRANSFER"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Resignation Date</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.resignationDate || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address (Perm.)</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.permanentAddress || (u.address?.street ? u.address.street + ", " + u.address.city : "N/A")}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Work Location</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.workLocation || rx.workLocation || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">E-Mail</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.email || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address (Corres.)</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.currentAddress || u.permanentAddress || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Mobile</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.mobile || "N/A"}</span>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">Employee Code</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.employeeId || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">DOJ</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.joiningDate || rx.joiningDate ? new Date(u.joiningDate || rx.joiningDate).toLocaleDateString("en-GB") : "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Bank A/c No.</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.bankDetails?.accountNumber || rx.bankAccount || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ESI A/c No</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.esiNumber || rx.esiNumber || "N.A."}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Department</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.department || rx.department || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Category</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.category || "UNIVERSAL"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Bank Name</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.bankDetails?.bankName || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Gender</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.gender || rx.gender || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Confirmation Date</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.confirmationDate || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Shift</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.shift || "DAY SHIFT"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">DOB</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.dob || rx.dob ? new Date(u.dob || rx.dob).toLocaleDateString("en-GB") : "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">UAN</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.uanNumber || rx.uanNumber || "N.A."}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Aadhar No.</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.aadharNumber || rx.aadharNumber || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Attendance Registry -->
        <div class="section">
          <div class="section-inner">
            <div class="info-grid">
              <div>
                <div class="info-row">
                  <span class="info-label">Month Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.monthDays || 30}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Weekly-Off</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.weeklyOffDays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Paid Holidays</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.paidHolidays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Working Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${(payroll?.monthDays || 30) - (payroll?.weeklyOffDays || 0)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">LWP</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.absentDays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Present Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.presentDays || 0}</span>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">Total Paid Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${(payroll?.presentDays || 0) + (payroll?.leaveDays || 0)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Days-Off</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.daysOff || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Unpaid Holidays</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.unpaidHolidays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Max Payable Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.monthDays || 30}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Net Paid Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${(payroll?.presentDays || 0) + (payroll?.leaveDays || 0)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Paid Leaves</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.leaveDays || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Table -->
        <div class="table-section">
          <table>
            <thead>
              <tr>
                <th style="width: 36%;">Earnings</th>
                <th style="width: 14%; text-align: right;">Amount Rs.</th>
                <th style="width: 36%;">Deductions</th>
                <th style="width: 14%; text-align: right;">Amount Rs.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>BASIC SALARY</td>
                <td style="text-align: right;">${(b.basic || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>PF</td>
                <td style="text-align: right;">${(b.pf || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>HRA</td>
                <td style="text-align: right;">${(b.hra || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>ESI</td>
                <td style="text-align: right;">${(b.esi || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>TRANSPORT ALLOWANCE</td>
                <td style="text-align: right;">${(b.transportAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>PROFESSIONAL TAX</td>
                <td style="text-align: right;">${(b.professionalTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Medical Allowance</td>
                <td style="text-align: right;">${(b.medicalAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>Salary Advance</td>
                <td style="text-align: right;">${(b.salaryAdvance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Special Allowance</td>
                <td style="text-align: right;">${(b.specialAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>TDS</td>
                <td style="text-align: right;">${(b.tds || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Salary Arrears</td>
                <td style="text-align: right;">${(b.salaryArrears || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
                <td style="text-align: right;"></td>
              </tr>
              <tr>
                <td>Bonus</td>
                <td style="text-align: right;">${(b.bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
                <td style="text-align: right;"></td>
              </tr>
              <tr class="total-row">
                <td>Total Earnings</td>
                <td style="text-align: right;">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>Total Deductions</td>
                <td style="text-align: right;">${totalDeducts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="net-pay-row">
                <td colspan="4">
                  <div style="display: flex;">
                    <span class="net-pay-label">Net Pay</span>
                    <span>: Rs. ${netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </td>
              </tr>
              <tr class="net-pay-row">
                <td colspan="4">
                  <div style="display: flex;">
                    <span class="net-pay-label">In Words</span>
                    <span>: Rs. ${numberToWords(netSalary)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CTC Section -->
        <div class="ctc-section">
          <div class="ctc-header">Employer's Contribution (CTC)</div>
          <table class="ctc-table">
            <tbody>
              <tr>
                <td style="width: 86%;">GROSS EARNING</td>
                <td style="width: 14%; text-align: right; font-weight: bold;">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>EMPLOYER'S PROVIDENT FUND</td>
                <td style="text-align: right; font-weight: bold;">${c.providentFund ? c.providentFund.toLocaleString() : "Nil"}</td>
              </tr>
              <tr>
                <td style="padding-left: 24px; font-style: italic; opacity: 0.6;">- - &gt; PENSION FUND</td>
                <td style="text-align: right; font-size: 8.4px; font-weight: bold;">Nil</td>
              </tr>
              <tr>
                <td style="padding-left: 24px; font-style: italic; opacity: 0.6;">- - &gt; PROVIDENT FUND</td>
                <td style="text-align: right; font-size: 8.4px; font-weight: bold;">Nil</td>
              </tr>
              <tr>
                <td>EMPLOYER'S STATE INSURANCE</td>
                <td style="text-align: right; font-weight: bold;">${c.employerEsi ? c.employerEsi.toLocaleString() : "Nil"}</td>
              </tr>
              <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; text-transform: uppercase; text-align: right;">
                <td>Total :</td>
                <td>${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td colspan="2">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                    <div>
                      <div style="display: flex;"><span style="width: 56px; text-transform: uppercase;">Total CTC</span><span>: Rs. ${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div style="display: flex;"><span style="width: 56px; text-transform: uppercase;">In Words</span><span style="font-weight: bold; text-decoration: underline;">: Rs. ${numberToWords(totalGross)}</span></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer & Signatory (Pushed to bottom) -->
        <div style="margin-top: auto;">
          <div class="footer" style="font-size: 8.4px;">
            <p>TDS Deducted Upto ${monthName} : Rs. Nil</p>
            <p>This is Computer Generated Sheet, does not require Signature.</p>
          </div>
  
          <!-- Signatory -->
          <div class="signatory">
            <div class="signatory-box">
              <div class="signatory-text">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateLabReceiptHtml = (data: any) => {
  const { hospital = {}, patient = {}, appointment = {}, payment = {}, headerHtml, footerHtml, labTests = [] } = data || {};

  const formattedPatientName = formatPatientNameWithPrefix(
    patient.name || patient.user?.name || data.patientName || '',
    appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific || patient.honorific || patient.profile?.honorific || patient.honorificTitle || data.honorific
  );

  const patAge = computeAgeFromDob(patient.dob || patient.dateOfBirth, patient.age, patient.ageUnit) || patient.age || appointment.patientDetails?.age || data.age || "-";
  const patGender = (patient.gender && patient.gender !== "-")
    ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1))
    : (appointment.patientDetails?.gender || data.gender || "-");
  const ageGenderStr = `${patAge !== "-" ? patAge : "-"} / ${patGender}`;

  const patMobile = patient.mobile || patient.phone || appointment.patientDetails?.mobile || data.mobile || "-";
  const patMRN = patient.mrn || patient.medicalRecordNumber || patient.uhid || appointment.patientDetails?.mrn || data.mrn || "N/A";
  const docName = formatDoctorName(appointment.doctorName || appointment.primaryDoctor || appointment.doctor?.name || appointment.refDoctor || data.refDoctor || data.doctorName || "-");

  const visitDateRaw = appointment.date || appointment.appointmentDate || payment.date || data.billDate || data.createdAt || data.date || (appointment as any).bookedAt || new Date();
  const safeVisitDate = parseSafeDate(visitDateRaw) || parseSafeDate(payment.date) || parseSafeDate((appointment as any).bookedAt) || parseSafeDate(data.createdAt) || new Date();
  const currentDate = safeVisitDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const currentTime = appointment.time || appointment.appointmentTime || safeVisitDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  // Tests list
  let testItems: any[] = [];
  if (Array.isArray(labTests) && labTests.length > 0) {
    testItems = labTests;
  } else if (Array.isArray(data.items) && data.items.length > 0) {
    testItems = data.items;
  } else if (Array.isArray(data.tests) && data.tests.length > 0) {
    testItems = data.tests;
  } else if (Array.isArray(appointment.tests) && appointment.tests.length > 0) {
    testItems = appointment.tests;
  } else if (appointment.testName || data.testName || data.name) {
    testItems = [{ testName: appointment.testName || data.testName || data.name, price: payment.amount || 0 }];
  }

  const totalAmount = Number(
    payment.totalBillAmount ??
    payment.fee ??
    payment.originalAmount ??
    data.totalAmount ??
    data.amount ??
    payment.amount ??
    testItems.reduce((acc: number, t: any) => acc + (Number(t.price ?? t.cost) || 0), 0)
  );
  const discountAmount = Number(payment.discount || payment.discountAmount || appointment.discount || data.discount || 0);
  const paidAmount = Number(payment.amount != null ? payment.amount : (data.paidAmount ?? payment.paidAmount ?? totalAmount));
  const balanceAmount = Number(payment.balance ?? data.balance ?? (totalAmount - discountAmount - paidAmount > 0 ? totalAmount - discountAmount - paidAmount : 0));
  const paymentMode = formatReceiptPaymentMode(payment, appointment) || data.paymentMode || "Cash";

  const rawInvoiceId = data.invoiceId || data.invoiceNo || payment.receiptNumber || payment.receiptNo || appointment.appointmentId || appointment.sampleId || "";
  let invoiceId = rawInvoiceId;
  if (!invoiceId) {
    invoiceId = "OPD-INVOICE";
  } else if (invoiceId.length >= 24) {
    invoiceId = `OPD-${invoiceId.slice(-6).toUpperCase()}`;
  }

  const labName = data.labInfo?.name || (hospital.name ? (hospital.name.toUpperCase().includes("LAB") ? hospital.name.toUpperCase() : `${hospital.name.toUpperCase()} LABORATORY`) : "LABORATORY");
  const labAddress = data.labInfo?.address || hospital.address || "";
  const labPhone = data.labInfo?.phone || hospital.phone || hospital.contact || "";
  const labEmail = data.labInfo?.email || hospital.email || "";
  const labLogo = data.labInfo?.logo || hospital.logo || "";

  const testRows = testItems.length > 0
    ? testItems.map((item: any, idx: number) => {
        const tName = item.testName || item.name || item.investigationName || item.description || "Diagnostic Test";
        const price = Number(item.price ?? item.cost ?? (testItems.length === 1 ? totalAmount : 0));
        return `
        <tr>
          <td style="border: 1px solid #000000; padding: 6px 10px; text-align: left; width: 60px;">${idx + 1}</td>
          <td style="border: 1px solid #000000; padding: 6px 10px; text-align: left; font-weight: 500;">${tName}</td>
          <td style="border: 1px solid #000000; padding: 6px 10px; text-align: right; width: 120px; font-weight: 700;">₹${price.toFixed(2)}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="3" style="border: 1px solid #000000; padding: 12px; text-align: center;">No tests recorded on this invoice</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OPD Invoice - ${invoiceId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 8mm 12mm; }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #000000;
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bill-wrapper {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      min-height: 100%;
    }
    table { border-collapse: collapse; }
    th, td { box-sizing: border-box; }
    @media print {
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body onload="window.print();">
  <div class="bill-wrapper">
    <div>
      ${headerHtml ? `<div style="width: 100%; margin-bottom: 12px;">${headerHtml}</div>` : `
      <!-- HeaderPrint Component matching Screenshot 3 -->
      <div style="width: 100%; font-family: 'Inter', Arial, sans-serif; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 20px; padding: 6px 0 10px 0;">
          ${labLogo ? `
          <div style="width: 110px; max-height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${labLogo}" alt="Lab Logo" style="max-width: 100%; max-height: 80px; object-fit: contain;" />
          </div>` : `
          <div style="width: 85px; height: 70px; border: 1.5px solid #1e3a8a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-size: 11px; font-weight: bold; text-transform: uppercase; flex-shrink: 0;">
            LOGO
          </div>`}
          <div style="width: 2px; height: 60px; background-color: #cbd5e1; flex-shrink: 0;"></div>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.1;">
              ${labName}
            </h1>
            ${labEmail ? `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #1e3a8a; font-weight: 700; margin-top: 2px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>${labEmail}</span>
            </div>` : ""}
            ${(labAddress || labPhone) ? `
            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; flex-wrap: wrap;">
              ${labAddress ? `<span>${labAddress}</span>` : ""}
              ${(labAddress && labPhone) ? `<span style="color: #cbd5e1;">|</span>` : ""}
              ${labPhone ? `
              <div style="display: flex; align-items: center; gap: 5px; color: #15803d; font-weight: 700;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#15803d" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>${labPhone}</span>
              </div>` : ""}
            </div>` : ""}
          </div>
        </div>
        <div style="width: 100%; height: 4px; background-color: #15803d; border-radius: 2px;"></div>
      </div>`}

      <!-- Center Title: OPD INVOICE matching Screenshot 3 -->
      <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 12px; position: relative; width: 100%;">
        <div style="width: 100%; border-top: 1px solid #000000; position: absolute; top: 11px; left: 0; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; background-color: #ffffff; padding: 0 16px; font-weight: 800; font-size: 14px; text-transform: uppercase; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 2px;">
          OPD INVOICE
        </span>
      </div>

      <!-- Info Grid Box matching Screenshot 3 -->
      <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <!-- Invoice Info (Left) -->
          <td style="width: 50%; vertical-align: top; padding: 8px 12px; border-right: 1px solid #000000;">
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #000000;">INVOICE INFORMATION</div>
            <table style="width: 100%; font-size: 11px; line-height: 1.5;">
              <tr>
                <td style="width: 85px; font-weight: 600; color: #000000;">Invoice ID:</td>
                <td style="color: #000000; font-weight: 700;">${invoiceId}</td>
              </tr>
              <tr>
                <td style="width: 85px; font-weight: 600; color: #000000;">Date:</td>
                <td style="color: #000000;">${currentDate}</td>
              </tr>
            </table>
          </td>

          <!-- Patient Info (Right) -->
          <td style="width: 50%; vertical-align: top; padding: 8px 12px;">
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #000000;">PATIENT INFORMATION</div>
            <table style="width: 100%; font-size: 11px; line-height: 1.5;">
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Name:</td>
                <td style="color: #000000; font-weight: 700;">${formattedPatientName || "Patient"}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">MRN:</td>
                <td style="color: #000000; font-weight: 700;">${patMRN}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Age / Gender:</td>
                <td style="color: #000000;">${ageGenderStr}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Mobile:</td>
                <td style="color: #000000;">${patMobile}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Ref. Doctor:</td>
                <td style="color: #000000;">${docName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Items Table matching Screenshot 3 -->
      <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
        <thead>
          <tr style="background-color: #e5e7eb; color: #000000;">
            <th style="border: 1px solid #000000; padding: 5px 8px; text-align: left; width: 55px; font-weight: 700;">S.No</th>
            <th style="border: 1px solid #000000; padding: 5px 8px; text-align: left; font-weight: 700;">Test / Service</th>
            <th style="border: 1px solid #000000; padding: 5px 8px; text-align: right; width: 110px; font-weight: 700;">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${testRows}
        </tbody>
      </table>

      <!-- Summary / Totals Section matching Screenshot 3 -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 14px;">
        <tr>
          <!-- Left: Payment Summary -->
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Payment Mode:</td>
                <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #000000;">${paymentMode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Payment Status:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">${balanceAmount > 0 ? "Partially Paid" : "Fully Paid"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Bill Date:</td>
                <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #000000;">${currentDate}</td>
              </tr>
              <tr style="background-color: #e5e7eb;">
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Bill Time:</td>
                <td style="padding: 6px 10px; text-align: right; color: #000000; font-weight: 600;">${currentTime}</td>
              </tr>
            </table>
          </td>

          <!-- Right: Totals Box -->
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Total Amount:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; border-bottom: 1px solid #000000;">₹${totalAmount.toFixed(2)}</td>
              </tr>
              ${discountAmount > 0 ? `
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Discount:</td>
                <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #000000;">- ₹${discountAmount.toFixed(2)}</td>
              </tr>` : ""}
              <tr style="background-color: #e5e7eb;">
                <td style="padding: 6px 10px; font-weight: 700; color: #000000;">Balance Due:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #000000;">₹${balanceAmount.toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- FooterPrint Component matching Screenshot 3 -->
    <div style="margin-top: auto; padding-top: 10px;">
      ${footerHtml ? `<div>${footerHtml}</div>` : `
      ${(labPhone || labEmail) ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed;">
        <tr>
          ${labPhone ? `
          <td style="width: ${labEmail ? '50%' : '100%'}; background-color: #15803d; color: #ffffff; padding: 6px 14px; font-size: 11px; font-weight: 700; vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>${labPhone}</span>
            </div>
          </td>` : ""}
          ${labEmail ? `
          <td style="width: ${labPhone ? '50%' : '100%'}; background-color: #1e3a8a; color: #ffffff; padding: 6px 14px; font-size: 11px; font-weight: 700; vertical-align: middle; text-align: ${labPhone ? 'right' : 'left'};">
            <div style="display: flex; align-items: center; justify-content: ${labPhone ? 'flex-end' : 'flex-start'}; gap: 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>${labEmail}</span>
            </div>
          </td>` : ""}
        </tr>
      </table>` : ""}
      ${labAddress ? `
      <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 500; line-height: 1.4;">
        <span style="font-weight: 700; color: #1e3a8a;">${labName} &mdash; </span>${labAddress}
      </div>` : ""}`}
    </div>
  </div>
</body>
</html>`;
};

export const generateOPDRegistrationSlipHtml = (data: any) => {
  const { hospital = {}, patient = {}, appointment = {}, payment = {}, headerHtml, footerHtml } = data || {};
  const isLab = data.isLab === true ||
    data.registrationType === 'LAB' ||
    (appointment?.type && (appointment.type.toLowerCase() === 'lab' || appointment.type.toLowerCase() === 'lab_test' || appointment.type.toLowerCase().includes('lab'))) ||
    (appointment?.specialization && appointment.specialization.toLowerCase().includes('lab'));

  if (isLab) {
    return generateLabReceiptHtml(data);
  }
  const ageDisplay = computeAgeFromDob(patient.dob, patient.age, patient.ageUnit) || patient.age || "N/A";
  const doctorTitle = formatDoctorName(appointment.doctorName);

  const formattedPatientName = formatPatientNameWithPrefix(
    patient.name || patient.user?.name,
    appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific || patient.honorific || patient.profile?.honorific || patient.honorificTitle || patient.patientHonorific
  );

  const rawToken = appointment.token_number || appointment.tokenNo || appointment.tokenNumber || appointment.token || appointment.queueNumber || appointment.dailyTokenNumber || (appointment.queuePosition !== undefined ? appointment.queuePosition : undefined) || (() => {
    const refStr = String(appointment.appointmentId || patient.mrn || "10");
    const digits = refStr.replace(/\D/g, "");
    const num = parseInt(digits.slice(-3) || "10", 10);
    return (num % 30) + 1;
  })();
  const tokenNoDisplay = !isNaN(Number(rawToken)) ? String(rawToken).padStart(2, '0') : rawToken;

  const getSymptomsText = (val: any) => {
    if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '';
    if (typeof val === 'string' && val.trim() !== '') return val.trim();
    return '';
  };
  const symptomDisplay = getSymptomsText(patient.symptoms) ||
    getSymptomsText(appointment.symptoms) ||
    getSymptomsText(appointment.reason) ||
    getSymptomsText(patient.chiefComplaint) ||
    getSymptomsText(appointment.notes) ||
    getSymptomsText(appointment.chiefComplaint) ||
    getSymptomsText(appointment.reasonForVisit) ||
    getSymptomsText(payment.reason) ||
    "N/A";

  const isDischargeTx = Boolean(
    payment?.isDischarge ||
    payment?.isDischargeTransaction ||
    patient?.dischargeType ||
    data.registrationType === 'DISCHARGE' ||
    (appointment.type && /discharge|settlement/i.test(appointment.type)) ||
    (appointment.specialization && /discharge|settlement/i.test(appointment.specialization))
  );

  const isIPD = data.registrationType === 'IPD' || (appointment.type && appointment.type.toUpperCase().includes('IPD')) || isDischargeTx;
  const slipTitle = isDischargeTx ? "IPD Discharge Slip" : isIPD ? "IPD Admission Slip" : "OPD Registration Slip";
  const idLabel = (isIPD || isDischargeTx) ? "IPD.No." : "OP.No.";
  const tokenLabel = isDischargeTx ? "Discharge Token" : isIPD ? "Admission Token" : "Today's Token No";
  const visitTypeDisplay = isDischargeTx ? "IPD Discharge Settlement" : appointment.type || (isIPD ? "IPD Admission" : "Registration");

  // ── Follow-up validity block ─────────────────────────────────────────────
  // Priority: stored followUpStatus snapshot (booked values) › live hospital settings
  // We NEVER use hardcoded numbers (7, 30, etc.) — always the hospital admin's configured value.
  const visitCalculations = appointment.visitType || appointment.visitCalculations || (() => {
    const count = appointment.followUpStatus?.doctorVisitCount || appointment.followUpStatus?.visitCount || (appointment.type?.toLowerCase() === 'follow-up' ? 2 : 1);
    const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
    return count >= 1 && count <= ordinals.length ? `${ordinals[count - 1]} Visit` : `Visit #${count}`;
  })();
  const followUpStatus = appointment.followUpStatus;

  const formatDDMMYYYY = (dateInput: Date | string | undefined): string => {
    if (!dateInput) return "N/A";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  let baseVisitDate = parseSafeDate(appointment.date) || parseSafeDate(appointment.appointmentDate) || parseSafeDate(payment.date) || new Date();

  // Always use the live hospital admin's currently configured values!
  // Do not use the stored snapshot because admin might have updated the window duration.
  let followUpExpiryMsg = "";
  const liveEnableExpiry = hospital.enableFollowUpExpiry ?? true;
  const liveRangeDays = isIPD ? hospital.ipdFollowUpDays : hospital.opdFollowUpDays;

  if (liveRangeDays !== undefined && liveRangeDays !== null) {
    const liveExpiryDate = new Date(baseVisitDate);
    liveExpiryDate.setDate(liveExpiryDate.getDate() + Number(liveRangeDays));
    if (!liveEnableExpiry) {
      followUpExpiryMsg = "Expiry validation disabled (Free follow-up always allowed).";
    } else {
      followUpExpiryMsg = `Visit date is ${formatDDMMYYYY(baseVisitDate)} and expiry date is ${formatDDMMYYYY(liveExpiryDate)} total ${liveRangeDays} days.`;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${slipTitle} - ${formattedPatientName || "Patient"}</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @page {
          size: A4;
          margin: 10mm 15mm;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #000;
          line-height: 1.4;
          margin: 0;
          padding: 15px;
          background: white;
          font-size: 10px;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 6px;
        }
        .hospital-branding {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .hospital-logo {
          max-height: 70px;
          width: auto;
          object-fit: contain;
          }
        .hospital-title {
          font-size: 24px;
          font-weight: 900;
          text-transform: uppercase;
          color: #8b0000;
          margin: 0;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .hospital-subtitle {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin: 2px 0 0 0;
          text-transform: uppercase;
        }
        .doctor-info {
          text-align: right;
          max-width: 320px;
        }
        .doctor-name {
          font-size: 16px;
          font-weight: 900;
          color: #8b0000;
          margin: 0;
          text-transform: uppercase;
        }
        .doctor-deg {
          font-size: 12px;
          font-weight: 700;
          color: #333;
          margin: 2px 0;
        }
        .doctor-spec {
          font-size: 12px;
          font-weight: 600;
          color: #555;
          margin: 1px 0;
        }
        .divider-thick {
          border-top: 2px solid #1e293b;
          margin: 5px 0 5px 0;
        }
        .patient-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          row-gap: 2px;
          column-gap: 20px;
          font-size: 10px;
          font-weight: 600;
          color: #000;
        }
        .grid-row {
          display: flex;
          margin-bottom: 2px;
        }
        .label {
          width: 145px;
          font-weight: 700;
          color: #475569;
          flex-shrink: 0;
        }
        .colon {
          width: 15px;
          color: #475569;
          font-weight: 700;
        }
        .value {
          font-weight: 700;
          color: #000;
          flex: 1;
        }
        .divider-thin {
          border-top: 1.5px solid #1e293b;
          margin: 5px 0 10px 0;
        }
        .clinical-workspace {
          position: relative;
        }
        .header-wrapper {
          width: 100%;
          padding: 0 20px;
          box-sizing: border-box;
        }
        .footer-wrapper {
          width: 100%;
          padding: 0 20px;
          box-sizing: border-box;
        }
        .receipt-container {
          width: 100%;
          padding: 0 20px;
          box-sizing: border-box;
        }
        .footer-note {
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }
        html, body {
          min-height: 100vh;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          background: white;
          box-sizing: border-box;
        }
        .clinical-workspace {
          flex: 1;
          min-height: 40px;
        }
        .footer-wrapper {
          width: 100%;
          padding: 0 20px;
          box-sizing: border-box;
          margin-top: auto;
          page-break-inside: avoid;
        }
        .footer-spacer {
          display: none;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 10mm;
          }
          html, body {
            min-height: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-wrapper {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            width: 100% !important;
            page-break-inside: avoid !important;
          }
          .patient-grid, .grid-row, .divider-thick, .divider-thin {
            page-break-inside: avoid !important;
          }
          .clinical-workspace {
            min-height: 40px !important;
            page-break-inside: avoid !important;
          }
          .footer-wrapper {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            padding: 0 5mm !important;
            box-sizing: border-box !important;
            background: white !important;
            z-index: 1000 !important;
            page-break-inside: avoid !important;
          }
          .footer-spacer {
            display: none !important;
            height: 0 !important;
          }
        }
      </style>
      ${!(data?.printWithHeader !== undefined ? data.printWithHeader : usePrintStore.getState().printWithHeader) ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
      </style>
      ` : ''}
    </head>
    <body onload="window.print();">
      <div class="header-wrapper">
        ${headerHtml ||
    `
          <div class="header-container">
            <div class="hospital-branding">
              ${hospital.logo ? `<img src="${hospital.logo}" alt="Logo" class="hospital-logo" />` : ""}
              <div>
                <h1 class="hospital-title" style="color: #8b0000;">${hospital.name || "SUPER SPECIALITY HOSPITAL"}</h1>
                ${hospital.address ? `<p class="hospital-subtitle" style="font-size: 11px; color: #555; font-weight: 600;">${hospital.address}</p>` : ""}
                ${hospital.contact ? `<p style="font-size: 11px; color: #555; margin: 2px 0 0 0; font-weight: 600;">Tel: ${hospital.contact}</p>` : ""}
              </div>
            </div>
            <div class="doctor-info">
              <h2 class="doctor-name" style="color: #8b0000;">${doctorTitle}</h2>
              ${appointment.degree ? `<p class="doctor-deg">${appointment.degree}</p>` : ""}
              ${appointment.specialization ? `<p class="doctor-spec">${appointment.specialization}</p>` : ""}
            </div>
          </div>
          `
    }
      </div>

      <div class="divider-thick"></div>

      <div class="patient-grid">
        <div class="grid-row">
          <span class="label">Name</span><span class="colon">:</span>
          <span class="value">${formattedPatientName}</span>
        </div>
        <div class="grid-row">
          <span class="label" style="width: 110px;">Age/Gender</span><span class="colon">:</span>
          <span class="value">${ageDisplay} / ${patient.gender || "Male"}</span>
        </div>

        <div class="grid-row">
          <span class="label">MR No.</span><span class="colon">:</span>
          <span class="value">${patient.mrn || "N/A"}</span>
        </div>
        <div class="grid-row">
          <span class="label" style="width: 110px;">DOB</span><span class="colon">:</span>
          <span class="value">${(() => {
      const val = patient.dob || patient.dateOfBirth;
      if (!val) return "N/A";
      if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) return val.trim();
      const d = new Date(val);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB') : String(val);
    })()}</span>
        </div>

        <div class="grid-row">
          <span class="label">Mobile No.</span><span class="colon">:</span>
          <span class="value">${patient.mobile || "N/A"}</span>
        </div>
        <div class="grid-row">
          <span class="label" style="width: 110px;">Visit Type</span><span class="colon">:</span>
          <span class="value">${visitTypeDisplay}</span>
        </div>

        <div class="grid-row">
          <span class="label">Visit Date</span><span class="colon">:</span>
          <span class="value">${appointment.date || appointment.appointmentDate || new Date().toLocaleDateString('en-GB')} &nbsp; ${appointment.time || ""}</span>
        </div>
        <div class="grid-row">
          <span class="label" style="width: 110px;">${idLabel}</span><span class="colon">:</span>
          <span class="value">${appointment.appointmentId || payment.receiptNumber || "N/A"}</span>
        </div>

        <div class="grid-row">
          <span class="label">Address</span><span class="colon">:</span>
          <span class="value">${patient.address || "N/A"}</span>
        </div>
        ${doctorTitle && doctorTitle !== 'Doctor' ? `
        <div class="grid-row">
          <span class="label" style="width: 110px;">Doctor</span><span class="colon">:</span>
          <span class="value" style="font-weight: 700; color: #1e40af;">${doctorTitle}</span>
        </div>` : '<div class="grid-row"></div>'}

        ${(() => {
      if (data.showGuardianDetails === false) return '';
      const gName = appointment.guardianName || patient.guardianName || '';
      const gRelation = appointment.guardianRelation || patient.guardianRelation || '';
      const gMobile = appointment.guardianMobile || patient.guardianMobile || '';
      const docRef = appointment.doctorReference || patient.doctorReference || '';
      const hasGuardian = gName || gRelation || gMobile;
      const hasDocRef = !!docRef;
      if (!hasGuardian && !hasDocRef) return '';
      return `
        <div style="grid-column: 1 / -1; margin-top: 6px; padding: 6px 8px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;">
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0369a1; letter-spacing: 0.6px; margin-bottom: 4px;">Guardian / Reference Details</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px 20px;">
            ${gName ? `<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:10px;font-weight:700;color:#475569;">Guardian Name</span><span style="color:#475569;">:</span><span style="font-size:10px;font-weight:800;color:#000;">${gName}${gRelation ? ' (' + gRelation + ')' : ''}</span></div>` : ''}
            ${gMobile ? `<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:10px;font-weight:700;color:#475569;">Guardian Mobile</span><span style="color:#475569;">:</span><span style="font-size:10px;font-weight:800;color:#000;">${gMobile}</span></div>` : ''}
            ${docRef ? `<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:10px;font-weight:700;color:#475569;">Doctor Reference</span><span style="color:#475569;">:</span><span style="font-size:10px;font-weight:800;color:#0f766e;">${docRef}</span></div>` : ''}
          </div>
        </div>`;
    })()}

        ${(() => {
      if (isDischargeTx) {
        const totalBill = Number(payment.totalBillAmount || payment.grandTotal || (Number(payment.amount || 0) + Number(payment.advanceAmount || 0)));
        const discount = Number(payment.discount || appointment.discount || 0);
        const afterDiscount = Math.max(0, totalBill - discount);
        const advancePaid = Number(payment.advanceAmount || 0);
        let settlementPaid = Number(payment.remainingPaid || payment.settlementAmount || payment.amount || 0);
        if (isDischargeTx && settlementPaid === 0 && afterDiscount > advancePaid) {
          settlementPaid = Math.max(0, afterDiscount - advancePaid);
        }
        let totalPaid = Number(payment.totalPaidAmount || payment.paidAmount || (advancePaid + settlementPaid));
        if (isDischargeTx && totalPaid <= advancePaid && afterDiscount > advancePaid) {
          totalPaid = advancePaid + settlementPaid;
        }
        let balanceDue = Number(payment.balance ?? payment.dueAmount ?? Math.max(0, afterDiscount - totalPaid));
        if (isDischargeTx && (payment.status?.toLowerCase() === 'paid' || payment.status?.toLowerCase() === 'completed')) {
          balanceDue = Math.max(0, afterDiscount - totalPaid);
        }
        return `
            <div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px; margin-top: 6px; padding: 8px 10px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 8px;">
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Grand Total</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a;">₹ ${Math.round(totalBill).toLocaleString('en-IN')}</div>
              </div>
              ${discount > 0 ? `
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: #e11d48; text-transform: uppercase;">(-) Discount</div>
                <div style="font-size: 13px; font-weight: 900; color: #e11d48;">- ₹ ${Math.round(discount).toLocaleString('en-IN')}</div>
              </div>` : ''}
              ${advancePaid > 0 ? `
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: #2563eb; text-transform: uppercase;">(-) Advance Paid</div>
                <div style="font-size: 13px; font-weight: 900; color: #2563eb;">- ₹ ${Math.round(advancePaid).toLocaleString('en-IN')}</div>
              </div>` : ''}
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Settlement Paid</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f766e;">₹ ${Math.round(settlementPaid).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Total Paid</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a;">₹ ${Math.round(totalPaid).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: ${balanceDue > 0 ? '#b91c1c' : '#15803d'}; text-transform: uppercase;">Balance Due</div>
                <div style="font-size: 13px; font-weight: 900; color: ${balanceDue > 0 ? '#b91c1c' : '#15803d'};">₹ ${Math.round(balanceDue).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Payment Mode</div>
                <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 2px;">${formatReceiptPaymentMode(payment, appointment)}</div>
              </div>
            </div>`;
      }
      return `
          <!-- Compact single row: Token | Fee (if discount) | Discount (if discount) | Paid Amount | Payment Mode -->
          <div style="grid-column: 1 / -1; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 4px; padding: 4px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 110px;">
              <span style="font-size: 10px; font-weight: 700; color: #475569; flex-shrink: 0;">${tokenLabel}</span>
              <span style="color: #475569; font-weight: 700; flex-shrink: 0;">:</span>
              <span style="font-size: 11px; font-weight: 900; color: #0f766e; background: #f0fdf4; padding: 1px 5px; border-radius: 3px; border: 1px solid #ccfbf1; display: inline-block;"># ${tokenNoDisplay}</span>
            </div>
            ${Number(payment.discount || appointment.discount || 0) > 0 ? `
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 100px;">
              <span style="font-size: 10px; font-weight: 700; color: #475569; flex-shrink: 0;">Fee</span>
              <span style="color: #475569; font-weight: 700; flex-shrink: 0;">:</span>
              <span style="font-size: 10px; font-weight: 700; color: #334155;">₹ ${Math.round(payment.totalBillAmount || payment.fee || payment.originalAmount || (Number(payment.amount || 0) + Number(payment.discount || appointment.discount || 0))).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 100px;">
              <span style="font-size: 10px; font-weight: 700; color: #e11d48; flex-shrink: 0;">Discount</span>
              <span style="color: #e11d48; font-weight: 700; flex-shrink: 0;">:</span>
              <span style="font-size: 10px; font-weight: 800; color: #e11d48;">- ₹ ${Math.round(Number(payment.discount || appointment.discount || 0)).toLocaleString('en-IN')}</span>
            </div>` : ''}
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 110px;">
              <span style="font-size: 10px; font-weight: 700; color: #475569; flex-shrink: 0;">Paid Amount</span>
              <span style="color: #475569; font-weight: 700; flex-shrink: 0;">:</span>
              <span style="font-size: 11px; font-weight: 900; color: #0f766e;">₹ ${Math.round(payment.amount != null ? payment.amount : (payment.paidAmount || 0)).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 110px;">
              <span style="font-size: 10px; font-weight: 700; color: #475569; flex-shrink: 0;">Payment Mode</span>
              <span style="color: #475569; font-weight: 700; flex-shrink: 0;">:</span>
              <span style="font-size: 10px; font-weight: 800; color: #1e293b;">${formatReceiptPaymentMode(payment, appointment)}</span>
            </div>
            ${(() => {
          const aptStat = String(appointment.paymentStatus || '').toUpperCase();
          const payStat = String(payment.status || payment.paymentStatus || '').toUpperCase();
          const isPaid = aptStat === 'PAID' || payStat === 'PAID' || /PAID|COMPLETED/i.test(aptStat) || /PAID|COMPLETED/i.test(payStat);
          const statusText = isPaid ? 'PAID' : 'UNPAID';
          const badgeColor = isPaid ? '#15803d' : '#b91c1c';
          const badgeBg = isPaid ? '#f0fdf4' : '#fef2f2';
          const badgeBorder = isPaid ? '#bbf7d0' : '#fecaca';
          return `
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 110px;">
              <span style="font-size: 10px; font-weight: 700; color: #475569; flex-shrink: 0;">Payment Status</span>
              <span style="color: #475569; font-weight: 700; flex-shrink: 0;">:</span>
              <span style="font-size: 10px; font-weight: 900; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">${statusText}</span>
            </div>`;
        })()}
          </div>`;
    })()}

        ${(payment.method || '').toUpperCase() === 'MIXED' && (payment.paymentDetails || payment.splitPayments || payment.breakdown)
      ? (() => {
        const breakdown = payment.paymentDetails || payment.splitPayments || payment.breakdown || {};
        const parts = [];
        if (breakdown.cash && Number(breakdown.cash) > 0) parts.push(`Cash: ₹${Number(breakdown.cash).toLocaleString('en-IN')}`);
        if (breakdown.card && Number(breakdown.card) > 0) parts.push(`Card: ₹${Number(breakdown.card).toLocaleString('en-IN')}`);
        if (breakdown.upi && Number(breakdown.upi) > 0) parts.push(`UPI: ₹${Number(breakdown.upi).toLocaleString('en-IN')}`);
        return parts.length > 0 ? `
                <div style="grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; padding: 3px 0; margin-top: 2px; font-size: 9.5px; color: #475569; font-weight: 700;">
                  <span style="color: #374151; font-weight: 800;">Breakdown:</span>
                  ${parts.map(p => `<span style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 3px; padding: 1px 6px; font-weight: 700;">${p}</span>`).join('')}
                </div>` : '';
      })()
      : ''
    }

        <!-- Follow-up & Visit Calculations Block -->
        ${followUpExpiryMsg ? `
        <div style="grid-column: span 2; margin-top: 15px; padding: 12px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 12px; font-family: 'Inter', sans-serif;">
          <div style="font-weight: 900; text-transform: uppercase; color: #1e293b; letter-spacing: 0.75px; margin-bottom: 6px; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Visit Summary &amp; Follow-up Validation</div>
          <div style="margin-bottom: 4px; color: #334155;"><strong>Visit Count:</strong> ${visitCalculations}</div>
          <div style="color: #0f766e; font-weight: 800;"><strong>Follow-up validity:</strong> ${followUpExpiryMsg}</div>
        </div>` : `
        <div style="grid-column: span 2; margin-top: 15px; padding: 12px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 12px; font-family: 'Inter', sans-serif;">
          <div style="font-weight: 900; text-transform: uppercase; color: #1e293b; letter-spacing: 0.75px; margin-bottom: 6px; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Visit Summary</div>
          <div style="margin-bottom: 4px; color: #334155;"><strong>Visit Count:</strong> ${visitCalculations}</div>
        </div>`}
      </div>

      <div class="divider-thin"></div>
      
      <div class="grid-row" style="margin-top: 4px; margin-bottom: 4px;">
        <span class="label" style="width: 150px;">Reason / Symptoms</span><span class="colon">:</span>
        <span class="value">${symptomDisplay}</span>
      </div>
      <div class="divider-thin"></div>

      <div class="clinical-workspace" style="min-height: 80px;">
        <!-- Open space for doctor prescription notes -->
      </div>

      ${footerHtml ? `
      <div class="footer-wrapper">
        ${footerHtml}
      </div>` : ""}
    </body>
    </html>
  `;
};

export const generateClinicalReceiptHtml = (data: any) => {
  const { hospital = {}, patient = {}, appointment = {}, payment = {}, headerHtml, footerHtml } = data || {};

  const isLab = data.isLab === true ||
    data.registrationType === 'LAB' ||
    (appointment?.type && (appointment.type.toLowerCase() === 'lab' || appointment.type.toLowerCase() === 'lab_test' || appointment.type.toLowerCase().includes('lab'))) ||
    (appointment?.specialization && appointment.specialization.toLowerCase().includes('lab'));

  if (isLab) {
    return generateLabReceiptHtml(data);
  }

  const isDischargeOrDetailed = data.forceDetailed === true ||
    data.registrationType === 'DISCHARGE' ||
    (patient.dischargeType && patient.dischargeType.toUpperCase() !== 'NONE') ||
    (appointment.type && (appointment.type.toUpperCase().includes('DISCHARGE') || appointment.type.toUpperCase().includes('SETTLEMENT'))) ||
    (appointment.specialization && appointment.specialization.toUpperCase().includes('DISCHARGE')) ||
    appointment.stayDuration;

  if (!isDischargeOrDetailed) {
    return generateOPDRegistrationSlipHtml(data);
  }

  const formattedPatientName = formatPatientNameWithPrefix(
    patient.name || patient.user?.name,
    appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific || patient.honorific || patient.profile?.honorific || patient.honorificTitle || patient.patientHonorific
  );

  const mrnCandidates = [
    patient.mrn,
    patient.mrnNumber,
    patient.medicalRecordNumber,
    patient.patientId,
    patient.uhid,
    patient.user?.mrn,
    patient.user?.patientId,
    appointment.mrn,
    appointment.patientDetails?.mrn,
    (appointment as any)?.patientMrn,
    (payment as any)?.mrn,
    (payment as any)?.patientMrn,
    (payment as any)?.referenceNode,
    (payment as any)?.referenceId,
    (appointment as any)?.referenceNode
  ];
  const resolvedPatientMrn = mrnCandidates.find(c => c && typeof c === 'string' && c.trim() !== '' && c.trim() !== 'N/A' && c.trim() !== 'Resolving...' && c.trim() !== '-' && !c.includes('undefined')) || (patient.mrn && patient.mrn !== 'Resolving...' ? patient.mrn : "N/A");

  const isDischargeTx = Boolean(
    payment?.isDischarge ||
    payment?.isDischargeTransaction ||
    patient?.dischargeType ||
    data.registrationType === 'DISCHARGE' ||
    (appointment.type && /discharge|settlement/i.test(appointment.type)) ||
    (appointment.specialization && /discharge|settlement/i.test(appointment.specialization))
  );

  const isIPD = data.registrationType === 'IPD' || (appointment.type && appointment.type.toUpperCase().includes('IPD')) || isDischargeTx;

  const totalBill = Number(payment.totalBillAmount || payment.grandTotal || (Number(payment.amount || 0) + Number(payment.advanceAmount || 0)));
  const discount = Number(payment.discount || appointment.discount || 0);
  const afterDiscount = Math.max(0, totalBill - discount);
  const advancePaid = Number(payment.advanceAmount || 0);
  let settlementPaid = Number(payment.remainingPaid || payment.settlementAmount || payment.amount || 0);
  if (isDischargeTx && settlementPaid === 0 && afterDiscount > advancePaid) {
    settlementPaid = Math.max(0, afterDiscount - advancePaid);
  }
  let totalPaid = Number(payment.totalPaidAmount || payment.paidAmount || (advancePaid + settlementPaid));
  if (isDischargeTx && totalPaid <= advancePaid && afterDiscount > advancePaid) {
    totalPaid = advancePaid + settlementPaid;
  }
  let balanceDue = Number(payment.balance ?? payment.dueAmount ?? Math.max(0, afterDiscount - totalPaid));
  if (isDischargeTx && (payment.status?.toLowerCase() === 'paid' || payment.status?.toLowerCase() === 'completed')) {
    balanceDue = Math.max(0, afterDiscount - totalPaid);
  }

  const getSymptomsText = (val: any) => {
    if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '';
    if (typeof val === 'string' && val.trim() !== '') return val.trim();
    return '';
  };
  const symptomDisplay = getSymptomsText(patient.symptoms) ||
    getSymptomsText(patient.chiefComplaint) ||
    getSymptomsText(appointment.symptoms) ||
    getSymptomsText(appointment.reason) ||
    getSymptomsText(appointment.notes) ||
    getSymptomsText(appointment.chiefComplaint) ||
    getSymptomsText(appointment.reasonForVisit) ||
    "N/A";

  // ── Follow-up validity block (detailed / IPD receipt) ──────────────────
  // Priority: stored followUpStatus snapshot (booked values) › live hospital settings
  // We NEVER use hardcoded numbers — always the hospital admin's configured value.
  const visitCalculations = appointment.visitType || appointment.visitCalculations || (() => {
    const count = appointment.followUpStatus?.doctorVisitCount || appointment.followUpStatus?.visitCount || (appointment.type?.toLowerCase() === 'follow-up' ? 2 : 1);
    const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
    return count >= 1 && count <= ordinals.length ? `${ordinals[count - 1]} Visit` : `Visit #${count}`;
  })();
  const followUpStatus = appointment.followUpStatus;

  const formatDDMMYYYY = (dateInput: Date | string | undefined): string => {
    if (!dateInput) return "N/A";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const visitDateRaw = appointment.date || appointment.appointmentDate || payment.date || (appointment as any).createdAt || (payment as any).createdAt || new Date();
  const baseVisitDate = parseSafeDate(visitDateRaw) || new Date();

  let followUpExpiryMsg = "";
  const liveEnableExpiry = hospital.enableFollowUpExpiry ?? true;
  const liveRangeDays = isIPD ? hospital.ipdFollowUpDays : hospital.opdFollowUpDays;

  if (liveRangeDays !== undefined && liveRangeDays !== null) {
    const liveExpiryDate = new Date(baseVisitDate);
    liveExpiryDate.setDate(liveExpiryDate.getDate() + Number(liveRangeDays));
    if (!liveEnableExpiry) {
      followUpExpiryMsg = "Expiry validation disabled (Free follow-up always allowed).";
    } else {
      followUpExpiryMsg = `Visit date is ${formatDDMMYYYY(baseVisitDate)} and expiry date is ${formatDDMMYYYY(liveExpiryDate)} total ${liveRangeDays} days.`;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Registration Bill - ${formattedPatientName}</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @media print {
          @page {
            size: A4;
            margin: 6mm 8mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
          }
          .header-wrapper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            z-index: 1000 !important;
          }
          .footer-wrapper {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            z-index: 1000 !important;
          }
          .print-header-spacer {
            height: 135px !important;
            margin-bottom: 0 !important;
          }
          .print-footer-spacer {
            height: 125px !important;
            margin-top: 0 !important;
          }
          .print-table {
            page-break-inside: auto !important;
          }
          .print-table > tbody > tr {
            page-break-inside: auto !important;
          }
          .print-table > tbody > tr > td {
            page-break-inside: auto !important;
          }
          .data-grid tr, .payment-table tr, .vitals-grid tr {
            page-break-inside: avoid !important;
          }
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          line-height: 1.3;
          margin: 0;
          padding: 0;
          background: white;
          background: white;
          font-size: 10px;
        }
        .receipt-container {
          width: 100%;
          padding: 0 15px;
          box-sizing: border-box;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        /* Fixed Header/Footer Styles */
        .header-wrapper {
          width: 100%;
          padding: 0 15px;
          box-sizing: border-box;
        }
        .footer-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          padding: 0 15px;
          box-sizing: border-box;
          background: white;
          z-index: 1000;
        }

        .print-header-spacer {
          height: 160px;
        }
        .print-footer-spacer {
          height: 200px;
        }
        @media screen {
          .print-header-spacer {
            margin-bottom: -160px;
          }
          .print-footer-spacer {
            margin-top: -80px; /* leaves 70px gap */
          }
        }
        
        ${headerHtml
      ? ""
      : `
        .hospital-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 10px;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 10px;
        }
        .hospital-details {
          text-align: left;
          flex: 1;
        }
        .hospital-name {
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
          color: #1e293b;
          letter-spacing: -0.5px;
        }
        .hospital-info {
          font-size: 10px;
          margin: 2px 0;
          color: #64748b;
          font-weight: 500;
        }
        `
    }
        .bill-title-row {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 15px;
          align-items: flex-end;
          margin-bottom: 8px;
          padding: 6px 10px;
          background-color: #f8fafc;
          border-radius: 6px;
        }
        .bill-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e40af;
          letter-spacing: 0.5px;
        }
        .bill-subtitle {
           font-size: 10px;
           color: #64748b;
           font-weight: 600;
           margin-top: 2px;
        }
        .bill-meta {
          text-align: right;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          word-break: break-all;
        }
        .section {
          margin-bottom: 5px;
        }
        .section-header {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 4px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 2px;
          color: #334155;
          letter-spacing: 0.8px;
        }
        .data-grid {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .data-grid td {
          padding: 3px 8px;
          border: 1px solid #f1f5f9;
          font-size: 9.5px;
          vertical-align: top;
        }
        .data-grid .label {
          font-weight: 700;
          background-color: #f8fafc;
          color: #64748b;
          width: 20%;
          text-transform: uppercase;
          font-size: 9px;
        }
        .data-grid .value {
          color: #1e293b;
          font-weight: 600;
        }
        .vitals-grid {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .vitals-grid th, .vitals-grid td {
          border: 1px solid #f1f5f9;
          padding: 3px 6px;
          text-align: left;
          font-size: 9.5px;
        }
        .vitals-grid th {
          background-color: #f8fafc;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8px;
        }
        .vitals-grid td {
          font-weight: 700;
          color: #1e293b;
        }
        .clinical-box {
          padding: 6px 12px;
          background-color: #f0f9ff;
          border-left: 4px solid #0ea5e9;
          border-radius: 4px;
          margin-bottom: 6px;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
        }
        .payment-table th, .payment-table td {
          padding: 6px 12px;
          border: 1px solid #f1f5f9;
          text-align: left;
          font-size: 11px;
        }
        .payment-table th {
          background-color: #fef3c7;
          color: #92400e;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 10px;
        }
        .total-row td {
          font-weight: 900;
          font-size: 12px;
          background-color: #f8fafc;
          border-top: 2px solid #1e293b !important;
        }
        .payment-footer {
          margin-top: 10px;
          font-size: 9.5px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background-color: #f8fafc;
          border-radius: 6px;
        }
        .status-paid {
          color: #059669;
          text-transform: uppercase;
        }
        .footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 2px solid #1e293b;
          font-size: 9.5px;
          color: #64748b;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          gap: 15px;
        }
        .footer > div {
          flex: 1;
        }
        .footer .address-container {
          text-align: left;
          max-width: 60%;
        }
        .footer .contact-container {
          text-align: right;
        }
        .signatory-box {
          text-align: center;
        }
        .sign-line {
          width: 180px;
          border-bottom: 1px solid #1e293b;
          margin-bottom: 8px;
        }
        .authorized-text {
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          color: #1e293b;
        }
        .no-print {
          display: block;
          margin: 20px auto;
          text-align: center;
        }
        .return-btn {
          padding: 10px 24px;
          background-color: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
        }
        @media print {
          .no-print { display: none !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          .header-wrapper {
            position: fixed;
            top: 0;
            left: 8mm;
            right: 12mm;
            padding: 6mm 0 0;
            background: white;
            z-index: 1000;
          }
          
          .footer-wrapper {
            position: fixed;
            bottom: 1px;
            left: 8mm;
            right: 12mm;
            padding: 0 0 1px;
            background: white;
            z-index: 1000;
          }

          @page {
            size: A4;
            margin: 0; /* Handled by fixed padding for high precision */
          }
          
          body {
            padding: 0;
          }
          
          .receipt-container {
             padding: 0 12mm 0 8mm;
             box-sizing: border-box;
          }
        }
      </style>
      ${!(data?.printWithHeader !== undefined ? data.printWithHeader : usePrintStore.getState().printWithHeader) ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
        .print-settings-toggle-wrapper { visibility: visible !important; }
      </style>
      ` : ''}
    </head>
    <body onload="window.print();">
      <script>
        window.onafterprint = function() {
          setTimeout(() => {
            window.close();
          }, 500);
        };
      </script>
      <div class="no-print" style="background: white; padding: 10px; border-bottom: 2px solid #0f172a; text-align: center;">
         <button onclick="window.close()" class="return-btn" style="width: 100%; max-width: 400px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">
            &#8592; CLOSE RECEIPT
         </button>
      </div>

      <!-- These wrappers are fixed during print -->
      <div class="header-wrapper">
        ${headerHtml ||
    `
        <div class="hospital-header">
          ${hospital.logo ? `<img src="${hospital.logo}" alt="Logo" style="max-height: 85px; width: auto; object-fit: contain;" />` : ""}
          <div class="hospital-details">
            <h1 class="hospital-name">${hospital.name}</h1>
            <p class="hospital-info">${hospital.address || ""}</p>
            <p class="hospital-info">${hospital.contact ? `Phone: ${hospital.contact}` : ""} ${hospital.email ? ` | Email: ${hospital.email}` : ""}</p>
          </div>
        </div>
        `
    }
      </div>


      <div class="receipt-container">

        <table class="print-table">
          <thead>
            <tr>
              <td>
                <!-- Reserved space for fixed header -->
                <div class="print-header-spacer"></div>
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                <!-- Bill Title Row -->
                <div class="bill-title-row">
                  <div>
                    <div class="bill-title">
                      ${isDischargeTx
      ? "IPD DISCHARGE BILLING STATEMENT"
      : isIPD
        ? "IPD ADMISSION RECEIPT"
        : (appointment.type?.toLowerCase() === 'follow-up'
          ? "FOLLOW-UP APPOINTMENT RECEIPT"
          : "PATIENT REGISTRATION BILL")
    }
                    </div>
                    <div class="bill-subtitle">
                      ${isDischargeTx
      ? "Hospital Discharge & Final Settlement Invoice"
      : isIPD
        ? "Hospital Admission Document"
        : (appointment.type?.toLowerCase() === 'follow-up'
          ? "Follow-up Consultation Slip"
          : "Appointment Receipt")
    }
                    </div>
                  </div>
                  <div class="bill-meta">
                    <div><strong>Date:</strong> ${payment.date ? formatSafeDate(payment.date, { day: "2-digit", month: "short", year: "numeric" }) : (appointment.date ? formatSafeDate(appointment.date, { day: "2-digit", month: "short", year: "numeric" }) : formatSafeDate(new Date(), { day: "2-digit", month: "short", year: "numeric" }))}</div>
                    <div><strong>Booking Time:</strong> ${appointment.bookedAt ? formatTime12Hr(appointment.bookedAt) : new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</div>
                    <div><strong>Receipt No:</strong> ${payment.receiptNumber || payment.receiptNo || appointment.appointmentId}</div>
                  </div>
                </div>

                <!-- Patient & Appointment Context -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px;">
                    <!-- Patient Identification Card -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; right: 0; background: #1e293b; color: white; padding: 2px 8px; border-bottom-left-radius: 8px; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">PATIENT IDENTITY</div>
                        <div style="font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                            ${formattedPatientName}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">MRN / Mobile</div>
                                <div style="font-size: 10px; font-weight: 700; color: #1e293b;">${resolvedPatientMrn} / ${patient.mobile || patient.user?.mobile || "N/A"}</div>
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Age / Gender</div>
                                <div style="font-size: 10px; font-weight: 700; color: #1e293b;">${computeAgeFromDob(patient.dob, patient.age, patient.ageUnit)} / ${patient.gender}</div>
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Blood Group</div>
                                <div style="font-size: 10px; font-weight: 700; color: #e11d48;">${patient.bloodGroup || "N/A"}</div>
                            </div>
                            <div>
                                 <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">DOB</div>
                                 <div style="font-size: 10px; font-weight: 700; color: #1e293b;">${(() => {
      const val = patient.dob || patient.dateOfBirth;
      if (!val) return "N/A";
      if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) return val.trim();
      const d = new Date(val);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB') : String(val);
    })()}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Consultant & Schedule Card -->
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 12px; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; right: 0; background: #0369a1; color: white; padding: 2px 8px; border-bottom-left-radius: 8px; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">ENCOUNTER DATA</div>
                        <div style="font-size: 13px; font-weight: 900; color: #0c4a6e; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                            ${formatDoctorName(appointment?.doctorName || "Assigned Physician")}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                             <div>
                                <div style="font-size: 8px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Specialization</div>
                                <div style="font-size: 10px; font-weight: 700; color: #0c4a6e;">${appointment.specialization || "General Physician"}</div>
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Visit Date</div>
                                <div style="font-size: 10px; font-weight: 700; color: #0c4a6e;">${appointment.date}</div>
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Slot</div>
                                <div style="font-size: 10px; font-weight: 700; color: #0c4a6e;">${formatTime12Hr(appointment.time || new Date())}</div>
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Engagement</div>
                                <div style="font-size: 10px; font-weight: 700; color: #0c4a6e;">${appointment.type || "CONSULTATION"}</div>
                            </div>
                        </div>
                </div>

                ${(() => {
      if (data.showGuardianDetails === false) return '';
      const gName = appointment.guardianName || patient.guardianName || '';
      const gRelation = appointment.guardianRelation || patient.guardianRelation || '';
      const gMobile = appointment.guardianMobile || patient.guardianMobile || '';
      const docRef = appointment.doctorReference || patient.doctorReference || '';
      const hasGuardian = gName || gRelation || gMobile;
      const hasDocRef = !!docRef;
      if (!hasGuardian && !hasDocRef) return '';
      return `
                <div style="margin-top: 8px; padding: 8px 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                  <div style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #0369a1; letter-spacing: 0.7px; margin-bottom: 6px;">Guardian / Reference Details</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px 24px;">
                    ${gName ? `<div><span style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Guardian Name</span><div style="font-size:10px;font-weight:800;color:#0f172a;">${gName}${gRelation ? ' (' + gRelation + ')' : ''}</div></div>` : ''}
                    ${gMobile ? `<div><span style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Guardian Mobile</span><div style="font-size:10px;font-weight:800;color:#0f172a;">${gMobile}</div></div>` : ''}
                    ${docRef ? `<div><span style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Doctor Reference</span><div style="font-size:10px;font-weight:800;color:#0f766e;">${docRef}</div></div>` : ''}
                  </div>
                </div>`;
    })()}

                <!-- Visit Summary & Follow-up Validation Block -->
                ${followUpExpiryMsg ? `
                <div style="margin-top: 15px; margin-bottom: 15px; padding: 12px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 12px; font-family: 'Inter', sans-serif;">
                  <div style="font-weight: 900; text-transform: uppercase; color: #1e293b; letter-spacing: 0.75px; margin-bottom: 6px; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Visit Summary &amp; Follow-up Validation</div>
                  <div style="margin-bottom: 4px; color: #334155;"><strong>Visit Type / Ordinal:</strong> ${visitCalculations} (${appointment.type || 'OPD'})</div>
                  <div style="color: #0f766e; font-weight: 800;"><strong>Follow-up validity:</strong> ${followUpExpiryMsg}</div>
                </div>` : `
                <div style="margin-top: 15px; margin-bottom: 15px; padding: 12px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 12px; font-family: 'Inter', sans-serif;">
                  <div style="font-weight: 900; text-transform: uppercase; color: #1e293b; letter-spacing: 0.75px; margin-bottom: 6px; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Visit Summary</div>
                  <div style="margin-bottom: 4px; color: #334155;"><strong>Visit Type / Ordinal:</strong> ${visitCalculations} (${appointment.type || 'OPD'})</div>
                </div>`}

                <!-- Vital Signs -->
                ${data.showVitals
      ? `
                <div class="section">
                  <div class="section-header">Vital Signs (Current Visit)</div>
                  <table class="vitals-grid">
                    <tr>
                      <th>Height</th>
                      <th>Weight</th>
                      <th>Temp</th>
                      <th>BP</th>
                      <th>Pulse</th>
                      <th>SpO2</th>
                      <th>Glucose</th>
                    </tr>
                    <tr>
                      <td>${patient.vitals?.height ? patient.vitals.height + " cm" : "-"}</td>
                      <td>${patient.vitals?.weight ? patient.vitals.weight + " kg" : "-"}</td>
                      <td>${patient.vitals?.temperature || patient.vitals?.temp ? (patient.vitals?.temperature || patient.vitals?.temp) + " °F" : "-"}</td>
                      <td>${patient.vitals?.bloodPressure || patient.vitals?.bp || "-"}</td>
                      <td>${patient.vitals?.pulse ? patient.vitals.pulse + " bpm" : "-"}</td>
                      <td>${patient.vitals?.spO2 || patient.vitals?.spo2 ? (patient.vitals?.spO2 || patient.vitals?.spo2) + "%" : "-"}</td>
                      <td>${patient.vitals?.glucose || patient.vitals?.sugar ? (patient.vitals?.glucose || patient.vitals?.sugar) + " mg/dL" : "-"}</td>
                    </tr>
                  </table>
                </div>
                `
      : ""
    }

                <!-- Reason / Symptoms -->
                ${(data.showVitals &&
      ((patient.allergies &&
        patient.allergies.length > 0 &&
        patient.allergies !== "None" &&
        patient.allergies !== "NONE") ||
        (patient.medicalHistory &&
          patient.medicalHistory !== "None" &&
          patient.medicalHistory !== "NONE" &&
          patient.medicalHistory !== "CLEAR"))) ||
      symptomDisplay !== "N/A"
      ? `
                <div class="section">
                  <div class="section-header">${data.showVitals ? "Medical History, Allergies &amp; Current Symptoms" : "Reason / Symptoms"}</div>
                  <table class="data-grid">
                    ${data.showVitals
        ? `
                    <tr>
                      ${patient.allergies &&
          patient.allergies.length > 0 &&
          patient.allergies !== "None" &&
          patient.allergies !== "NONE"
          ? `<td class="label" style="color: #e11d48; width:14%;">Allergies:</td>
                           <td class="value" style="color: #e11d48; width:36%;">
                             ${Array.isArray(patient.allergies) ? patient.allergies.join(", ") : patient.allergies}
                           </td>`
          : `<td class="label" style="width:14%;">Allergies:</td><td class="value" style="width:36%;">-</td>`
        }
                      ${patient.medicalHistory &&
          patient.medicalHistory !== "None" &&
          patient.medicalHistory !== "NONE" &&
          patient.medicalHistory !== "CLEAR"
          ? `<td class="label" style="width:14%;">Hist/Issues:</td>
                           <td class="value" style="width:36%;">${patient.medicalHistory}</td>`
          : `<td class="label" style="width:14%;">Hist/Issues:</td><td class="value" style="width:36%;">-</td>`
        }
                    </tr>
                    `
        : ""
      }
                    ${symptomDisplay !== "N/A"
        ? `
                    <tr>
                      <td class="label">Reason / Symptoms:</td>
                      <td colspan="3" class="value">${symptomDisplay}</td>
                    </tr>`
        : ""
      }
                  </table>
                </div>`
      : ""
    }

                <!-- Discharge Clinical Summary -->
                ${patient.dischargeType ||
      data.registrationType === "DISCHARGE" ||
      patient.diagnosis ||
      patient.provisionalDiagnosis ||
      patient.treatmentGiven ||
      patient.adviceAtDischarge ||
      patient.hospitalCourse ||
      patient.investigationsPerformed ||
      patient.surgicalProcedures
      ? `
                <div class="section">
                  <div class="section-header">Clinical Discharge Summary</div>
                  <table class="data-grid">
                    ${patient.dischargeType || data.registrationType === "DISCHARGE"
        ? `
                    <tr>
                      <td class="label" style="width:20%; color: #1d4ed8; background-color: #eff6ff;">Discharge Status:</td>
                      <td colspan="3" class="value" style="font-weight: 800; color: #1d4ed8; background-color: #eff6ff;">${patient.dischargeType || "FINAL DISCHARGE"}</td>
                    </tr>`
        : ""
      }
                    
                    ${patient.provisionalDiagnosis
        ? `
                    <tr>
                      <td class="label" style="width:20%;">Provisional Diag:</td>
                      <td colspan="3" class="value">${patient.provisionalDiagnosis}</td>
                    </tr>`
        : ""
      }
                    
                    ${patient.diagnosis
        ? `
                    <tr>
                      <td class="label" style="width:20%;">Final Diagnosis:</td>
                      <td colspan="3" class="value" style="font-weight: 800; color: #1e293b; text-transform: uppercase;">${patient.diagnosis}</td>
                    </tr>`
        : ""
      }

                    ${patient.hospitalCourse
        ? `
                    <tr>
                      <td class="label" style="width:20%;">Hospital Course:</td>
                      <td colspan="3" class="value">${patient.hospitalCourse}</td>
                    </tr>`
        : ""
      }

                    ${patient.investigationsPerformed
        ? `
                    <tr>
                      <td class="label" style="width:20%;">Investigations:</td>
                      <td colspan="3" class="value">${patient.investigationsPerformed}</td>
                    </tr>`
        : ""
      }
                    
                    ${patient.treatmentGiven
        ? `
                    <tr>
                      <td class="label" style="width:20%; background-color: #f0fdf4;">Treatment Given:</td>
                      <td colspan="3" class="value" style="background-color: #f0fdf4;">${patient.treatmentGiven}</td>
                    </tr>`
        : ""
      }

                    ${patient.surgicalProcedures
        ? `
                    <tr>
                      <td class="label" style="width:20%;">Procedures Done:</td>
                      <td colspan="3" class="value">${patient.surgicalProcedures}</td>
                    </tr>`
        : ""
      }

                    ${patient.medicationsPrescribed
        ? `
                    <tr>
                      <td class="label" style="width:20%; background-color: #f0fdf4; color: #15803d;">Meds @ Discharge:</td>
                      <td colspan="3" class="value" style="font-family: inherit; white-space: pre-wrap; background-color: #f0fdf4; font-weight: 700;">${patient.medicationsPrescribed}</td>
                    </tr>`
        : ""
      }
                    
                    ${patient.adviceAtDischarge ||
        patient.activityRestrictions ||
        patient.dietInstructions
        ? `
                    <tr>
                      <td class="label" style="width:20%;">Discharge Advice:</td>
                      <td colspan="3" class="value">
                        ${patient.adviceAtDischarge ? `<div style="margin-bottom: 6px;"><strong>General Advice:</strong> ${patient.adviceAtDischarge}</div>` : ""}
                        ${patient.activityRestrictions ? `<div style="margin-bottom: 6px;"><strong>Physical Activity:</strong> ${patient.activityRestrictions}</div>` : ""}
                        ${patient.dietInstructions ? `<div style="margin-bottom: 6px;"><strong>Dietary Instructions:</strong> ${patient.dietInstructions}</div>` : ""}
                      </td>
                    </tr>`
        : ""
      }

                    ${patient.followUpDate ||
        patient.followUpInstructions ||
        patient.warningSigns
        ? `
                    <tr style="background-color: #fffbeb;">
                      <td class="label" style="width:20%; border-top: 2px solid #f59e0b; background-color: #fef3c7; color: #92400e;">Follow-up & Emergency:</td>
                      <td colspan="3" class="value" style="border-top: 2px solid #f59e0b;">
                        ${patient.followUpDate ? `<div style="font-weight: 900; color: #92400e; margin-bottom: 4px; font-size: 11px;">NEXT VISIT: ${new Date(patient.followUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at ${formatTime12Hr(patient.followUpDate)}</div>` : ""}
                        ${patient.followUpInstructions ? `<div style="margin-bottom: 4px; font-weight: 600;">${patient.followUpInstructions}</div>` : ""}
                        ${patient.warningSigns ? `<div style="color: #b91c1c; font-size: 10px; font-weight: 900; padding: 6px; background-color: #fee2e2; border-radius: 4px; border: 1px solid #fecaca; margin-top: 4px;">⚠️ EMERGENCY WARNING SIGNS: ${patient.warningSigns.toUpperCase()}</div>` : ""}
                      </td>
                    </tr>`
        : ""
      }

                    ${patient.conditionAtDischarge
        ? `
                    <tr>
                      <td class="label" style="width:20%; background-color: #f0fdf4; color: #166534;">Final Condition:</td>
                      <td colspan="3" class="value" style="font-weight: 900; color: #166534; background-color: #f0fdf4; text-transform: uppercase;">${patient.conditionAtDischarge}</td>
                    </tr>`
        : ""
      }
                  </table>
                </div>`
      : ""
    }

                <!-- Payment Summary (Always displayed) -->
                <div class="section">
                  <div class="section-header">Payment Summary</div>
                  <table class="payment-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount (Rupees)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${isDischargeTx
      ? `
                        <tr>
                          <td style="font-weight: 700; color: #1e293b;">Grand Total</td>
                          <td style="text-align: right; font-weight: 800; font-size: 12px; color: #0f172a;">₹ ${Math.round(totalBill).toLocaleString('en-IN')}</td>
                        </tr>
                        ${discount > 0
        ? `
                        <tr style="color: #e11d48;">
                          <td style="font-weight: 700;">(-) Discount Applied</td>
                          <td style="text-align: right; font-weight: 800;">- ₹ ${Math.round(discount).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr style="font-weight: 700; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                          <td>After Discount</td>
                          <td style="text-align: right; font-weight: 800;">₹ ${Math.round(afterDiscount).toLocaleString('en-IN')}</td>
                        </tr>`
        : ""
      }
                        ${advancePaid > 0
        ? `
                        <tr style="color: #2563eb;">
                          <td style="font-weight: 700;">(-) Advance Paid</td>
                          <td style="text-align: right; font-weight: 800;">- ₹ ${Math.round(advancePaid).toLocaleString('en-IN')}</td>
                        </tr>`
        : ""
      }
                        <tr>
                          <td style="font-weight: 700; color: #0f766e;">${settlementPaid === 0 && discount > 0 ? 'Discount / Concession' : 'Settlement Paid Amount'}</td>
                          <td style="text-align: right; font-weight: 800; color: #0f766e;">₹ ${Math.round(settlementPaid === 0 && discount > 0 ? discount : settlementPaid).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr class="total-row" style="background-color: #f1f5f9; border-top: 2px solid #0f172a;">
                          <td style="font-weight: 900; color: #0f172a;">TOTAL PAID AMOUNT</td>
                          <td style="text-align: right; font-weight: 900; color: #0f172a; font-size: 13px;">₹ ${Math.round(totalPaid).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr style="${balanceDue > 0 ? 'background-color: #fef2f2; color: #b91c1c;' : 'background-color: #f0fdf4; color: #15803d;'} font-weight: 800;">
                          <td>${balanceDue > 0 ? 'BALANCE DUE (UNPAID)' : 'Balance Due'}</td>
                          <td style="text-align: right; font-weight: 900;">₹ ${Math.round(balanceDue).toLocaleString('en-IN')}</td>
                        </tr>
                      `
      : data.registrationType === "IPD"
        ? `
                        <tr>
                          <td style="font-weight: bold; color: #475569;">Initial Admission Fee</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.totalBillAmount || payment.fee || payment.originalAmount || (Number(payment.amount || 0) + Number(payment.discount || appointment.discount || 0))).toLocaleString()}</td>
                        </tr>
                        ${Number(payment.discount || appointment.discount || 0) > 0
          ? `
                        <tr style="color: #e11d48;">
                          <td style="font-weight: bold;">Discount Applied</td>
                          <td style="text-align: right; font-weight: 800;">- ₹ ${Math.round(Number(payment.discount || appointment.discount || 0)).toLocaleString()}</td>
                        </tr>`
          : ""
        }
                        <tr>
                          <td style="font-weight: bold; color: #0f766e;">Amount Paid (IPD Advance)</td>
                          <td style="text-align: right; font-weight: bold; color: #0f766e;">₹ ${Math.round(payment.amount != null ? payment.amount : (payment.totalPaidAmount || payment.advanceAmount || 0)).toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                          <td>TOTAL ADVANCE RECEIVED</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.amount != null ? payment.amount : (payment.totalPaidAmount || payment.advanceAmount || 0)).toLocaleString()}</td>
                        </tr>
                      `
        : `
                        <tr>
                          <td style="font-weight: bold; color: #475569;">Consultation / Registration Fee</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.totalBillAmount || payment.fee || payment.originalAmount || (Number(payment.amount || 0) + Number(payment.discount || appointment.discount || 0))).toLocaleString()}</td>
                        </tr>
                        ${Number(payment.discount || appointment.discount || 0) > 0
          ? `
                        <tr style="color: #e11d48;">
                          <td style="font-weight: bold;">Discount Applied</td>
                          <td style="text-align: right; font-weight: 800;">- ₹ ${Math.round(Number(payment.discount || appointment.discount || 0)).toLocaleString()}</td>
                        </tr>`
          : ""
        }
                        <tr>
                          <td style="font-weight: bold; color: #0f766e;">Net Paid Amount (OPD)</td>
                          <td style="text-align: right; font-weight: 800; color: #0f766e;">₹ ${Math.round(payment.amount != null ? payment.amount : (payment.totalPaidAmount || 0)).toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                          <td>TOTAL AMOUNT PAID</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.amount != null ? payment.amount : (payment.totalPaidAmount || 0)).toLocaleString()}</td>
                        </tr>
                      `
    }
                    </tbody>
                  </table>
                  <div class="payment-footer">
                    <div>Payment Method: ${payment.method || payment.mode || "N/A"}
                    ${(payment.method || payment.mode || '').toUpperCase() === 'MIXED' && (payment.paymentDetails || payment.splitPayments || payment.breakdown) ? (() => {
      const breakdown = payment.paymentDetails || payment.splitPayments || payment.breakdown || {};
      const parts = [];
      if (breakdown.cash && Number(breakdown.cash) > 0) parts.push(`Cash: ₹${Number(breakdown.cash).toLocaleString('en-IN')}`);
      if (breakdown.card && Number(breakdown.card) > 0) parts.push(`Card: ₹${Number(breakdown.card).toLocaleString('en-IN')}`);
      if (breakdown.upi && Number(breakdown.upi) > 0) parts.push(`UPI: ₹${Number(breakdown.upi).toLocaleString('en-IN')}`);
      if (breakdown.bankTransfer && Number(breakdown.bankTransfer) > 0) parts.push(`Bank: ₹${Number(breakdown.bankTransfer).toLocaleString('en-IN')}`);
      return parts.length > 0 ? `<div style="font-size: 10px; margin-top: 4px; padding: 4px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; display: inline-block;">${parts.join(' | ')}</div>` : '';
    })() : ''}
                    </div>
                    <div class="${(payment?.status || "").toUpperCase() === "PAID" ? "status-paid" : ""}">Payment Status: ${(payment?.status || "PAID").toUpperCase()}</div>
                  </div>
                  ${isDischargeTx && (payment.receipts?.length > 0 || payment.payments?.length > 0 || advancePaid > 0 || settlementPaid > 0)
      ? (() => {
        let receiptList = (payment.receipts && payment.receipts.length > 0)
          ? payment.receipts
          : (payment.payments && payment.payments.length > 0)
            ? payment.payments
            : [];
        if (receiptList.length === 0 && (advancePaid > 0 || settlementPaid > 0)) {
          const synth = [];
          if (advancePaid > 0) {
            synth.push({
              date: appointment.date || '-',
              receiptNo: 'IPD-ADVANCE',
              amount: advancePaid,
              mode: 'Advance'
            });
          }
          if (settlementPaid > 0) {
            synth.push({
              date: payment.date ? new Date(payment.date).toLocaleDateString('en-GB') : (appointment.date || '-'),
              receiptNo: payment.receiptNumber || payment.receiptNo || 'SETTLE-REC',
              amount: settlementPaid,
              mode: payment.mode || payment.method || 'Settlement'
            });
          }
          receiptList = synth;
        }
        const receiptTotal = receiptList.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        return `
                          <div style="margin-top: 12px; border-top: 1.5px solid #0f172a; padding-top: 8px;">
                            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 5px; letter-spacing: 0.5px;">Receipt Details :</div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                              <thead>
                                <tr style="background-color: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                                  <th style="padding: 4px 6px; text-align: left; font-weight: 700; width: 8%;">S.No</th>
                                  <th style="padding: 4px 6px; text-align: left; font-weight: 700; width: 22%;">Record Date</th>
                                  <th style="padding: 4px 6px; text-align: left; font-weight: 700; width: 28%;">Receipt No</th>
                                  <th style="padding: 4px 6px; text-align: right; font-weight: 700; width: 22%;">Amount</th>
                                  <th style="padding: 4px 6px; text-align: left; font-weight: 700; width: 20%;">Payment Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${receiptList.map((r: any, idx: number) => {
          const rDate = r.date ? formatSafeDate(r.date, { day: '2-digit', month: 'short', year: 'numeric' }) : (appointment.date ? formatSafeDate(appointment.date, { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
          const rNo = r.receiptNo || r.receiptNumber || r.transactionId || `REC-0${idx + 1}`;
          const rAmt = Math.round(Number(r.amount || 0)).toLocaleString('en-IN');
          const rType = r.type || r.mode || r.paymentMode || (idx === 0 && advancePaid > 0 ? 'Advance' : 'Settlement');
          return `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                      <td style="padding: 4px 6px; text-align: left;">${idx + 1}</td>
                                      <td style="padding: 4px 6px; text-align: left;">${rDate}</td>
                                      <td style="padding: 4px 6px; text-align: left; font-weight: 600;">${rNo}</td>
                                      <td style="padding: 4px 6px; text-align: right; font-weight: 700;">₹ ${rAmt}</td>
                                      <td style="padding: 4px 6px; text-align: left;">${rType}</td>
                                    </tr>
                                  `;
        }).join('')}
                                <tr style="background-color: #f8fafc; font-weight: 800; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a;">
                                  <td colspan="3" style="padding: 5px 6px; text-align: right; text-transform: uppercase;">Total :</td>
                                  <td style="padding: 5px 6px; text-align: right; color: #0f766e; font-size: 11px;">₹ ${Math.round(receiptTotal > 0 ? receiptTotal : totalPaid).toLocaleString('en-IN')}</td>
                                  <td style="padding: 5px 6px;"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>`;
      })()
      : ""
    }
                </div>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <td>
                <!-- Reserved space for fixed footer -->
                <div class="print-footer-spacer"></div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="footer-wrapper">
        ${footerHtml ||
    `
        <div class="footer">
          <div style="flex: 1;">
            <p style="margin: 0; font-weight: 700;">PREPARED BY: ${patient.preparedBy || "System Administrator"}</p>
            
            <p style="margin: 2px 0 0 0;">Print Date: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at ${formatTime12Hr(new Date())}</p>
          </div>
          <div class="signatory-box">
            <div class="sign-line"></div>
            <div class="authorized-text">Authorized Signatory</div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; margin-top: 2px;">${hospital.name.toUpperCase()}</div>
          </div>
        </div>
        `
    }
      </div>
    </body>
    </html>
  `;
};

// --- NEW HELPERS FOR REPRINTING (MATCHING DOCTOR TEMPLATES) ---

export const generatePrescriptionHtml = (data: any) => {
  const { hospital, patient, doctor, prescription, headerHtml, footerHtml, appointment } =
    data;
  const medicines = prescription.medicines || [];
  const dietAdvice = prescription.dietAdvice || [];

  // Helper to avoid double Dr. prefix
  const formatDoctorName = (name: string) => {
    if (!name) return "Unknown Doctor";
    return name.toLowerCase().startsWith("dr") ? name : `Dr. ${name}`;
  };

  const patientName = formatPatientNameWithPrefix(
    patient.name || patient.user?.name,
    patient.honorific || (appointment && (appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific)) || patient.profile?.honorific || patient.honorificTitle
  );
  const rawAge =
    patient.age ??
    patient.profile?.age ??
    patient.user?.age ??
    (appointment && (appointment.patientDetails?.age || appointment.age)) ??
    data.age ??
    "";

  let ageDisplay = "";
  if (rawAge !== "" && rawAge !== undefined && rawAge !== null && rawAge !== "N/A" && rawAge !== "-") {
    const cleanAgeStr = String(rawAge).trim();
    if (cleanAgeStr.match(/(Y|Years|Mos|Months|Days|Yr|Yrs)$/i)) {
      ageDisplay = cleanAgeStr;
    } else {
      ageDisplay = `${cleanAgeStr} Y`;
    }
  } else {
    const computed = computeAgeFromDob(
      patient.dob || patient.dateOfBirth || patient.user?.dob || patient.profile?.dob,
      rawAge,
      patient.ageUnit
    );
    if (computed && computed !== "N/A") {
      ageDisplay = computed.match(/(Y|Years|Mos|Months|Days|Yr|Yrs)$/i) ? computed : `${computed} Y`;
    }
  }

  const rawGender =
    patient.gender ||
    patient.profile?.gender ||
    patient.user?.gender ||
    (appointment && (appointment.patientDetails?.gender || appointment.gender)) ||
    data.gender ||
    "";
  const genderDisplay =
    rawGender && rawGender !== "-"
      ? String(rawGender).toUpperCase()
      : "N/A";

  const patientMRN =
    patient.mrn ||
    patient.profile?.mrn ||
    patient.medicalRecordNumber ||
    patient.uhid ||
    (appointment && (appointment.mrn || appointment.patientDetails?.mrn)) ||
    data.mrn ||
    "-";

  const displayDate = formatSafeDate(prescription.prescriptionDate || prescription.createdAt || new Date(), { day: "numeric", month: "long", year: "numeric" });

  let followUpFormatted = "";
  if (prescription.followUpDate) {
    try {
      followUpFormatted = formatSafeDate(prescription.followUpDate, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) { }
  }

  const calcQty = (med: any) => {
    if (med.quantity) return med.quantity;
    if (med.qty) return med.qty;
    let freqNum = 1;
    const fStr = typeof med.frequency === "object" ? formatFrequency(med.frequency) : String(med.frequency || med.freq || "");
    const fLower = fStr.toLowerCase();
    if (fLower.includes("night") && fLower.includes("morning")) freqNum = 2;
    else if (fLower.includes("1-0-1")) freqNum = 2;
    else if (fLower.includes("1-1-1")) freqNum = 3;
    else if (fLower.includes("twice")) freqNum = 2;
    else if (fLower.includes("thrice")) freqNum = 3;
    const days = parseInt(String(med.duration || "5").replace(/\D/g, "")) || 5;
    return freqNum * days;
  };

  const formattedDocName = formatDoctorName(doctor.name || doctor.user?.name);

  return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Prescription - ${patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    
                    @page { 
                      size: A4 portrait; 
                      margin: 0; 
                    }
                    html, body {
                      height: 100%;
                      margin: 0;
                      padding: 0;
                      background-color: #ffffff;
                      color: #000;
                      font-family: 'Inter', system-ui, -apple-system, sans-serif;
                      font-size: 11px;
                      line-height: 1.4;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }

                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        padding: 10mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        background: #ffffff;
                    }

                    .rx-info-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 20px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label { 
                        display: block; 
                        font-size: 8px; 
                        font-weight: 700; 
                        text-transform: uppercase; 
                        color: #777; 
                        margin-bottom: 2px; 
                        letter-spacing: 0.5px; 
                    }
                    .info-val { 
                        font-size: 11px; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        color: #000;
                    }

                    .diagnosis-box { margin-bottom: 15px; }
                    .diagnosis-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
                    .diagnosis-val { font-size: 11px; font-weight: 700; margin-left: 5px; color: #000; }

                    .section-label { 
                        font-size: 9px; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        color: #000; 
                        border-bottom: 1px solid #000; 
                        padding-bottom: 4px; 
                        margin-bottom: 8px; 
                        letter-spacing: 0.5px; 
                    }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                    th { text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #777; padding: 0 0 6px 0; border-bottom: 1px solid #eee; }
                    td { padding: 8px 0; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
                    
                    .med-name { font-size: 11px; font-weight: 700; color: #000; }
                    .med-meta { font-size: 10px; color: #444; }

                    .info-box {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f8fafc;
                        border: 1px solid #edf2f7;
                        border-radius: 8px;
                        padding: 10px 14px;
                        margin-top: 15px;
                        margin-bottom: 20px;
                        font-size: 10px;
                    }

                    .signatory-container {
                        margin-top: 40px;
                        display: flex;
                        justify-content: flex-end;
                    }
                    .signatory-box {
                        text-align: center;
                        width: 180px;
                    }
                    .sig-line {
                        border-top: 1.5px solid #000;
                        padding-top: 4px;
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        color: #000;
                    }
                    .sig-subtitle {
                        font-size: 8px;
                        font-weight: 600;
                        color: #64748b;
                        text-transform: uppercase;
                        margin-top: 2px;
                    }

                    .no-print {
                        position: sticky;
                        top: 0;
                        background: white;
                        padding: 10px;
                        z-index: 1000;
                        border-bottom: 2px solid #000;
                        text-align: center;
                    }
                    .return-btn {
                        padding: 10px 24px;
                        background-color: #000;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                        text-decoration: none;
                        font-family: inherit;
                        width: 100%;
                        max-width: 400px;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                    }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <!-- Branded Hospital Header -->
                    ${headerHtml || ""}

                    <div style="flex: 1 1 auto; display: flex; flex-direction: column;">
                        <!-- Rx Info Grid strictly matching PrescriptionDocument -->
                        <div class="rx-info-grid">
                            <div>
                                <span class="info-label">Patient Name</span>
                                <span class="info-val">${patientName}</span>
                            </div>
                            <div>
                                <span class="info-label">Age / Gender</span>
                                <span class="info-val">${ageDisplay || "N/A"} / ${genderDisplay}</span>
                            </div>
                            <div>
                                <span class="info-label">MRN Number</span>
                                <span class="info-val" style="color: #006af5;">${patientMRN}</span>
                            </div>
                            <div style="text-align: right;">
                                <span class="info-label">Date</span>
                                <span class="info-val">${displayDate}</span>
                            </div>
                        </div>

                        <!-- Diagnosis -->
                        <div class="diagnosis-box">
                            <span class="diagnosis-label">Provisional Diagnosis:</span>
                            <span class="diagnosis-val">${prescription.diagnosis || "General Consultation"}</span>
                        </div>

                        <!-- Prescribed Medications Table -->
                        <div style="margin-top: 10px;">
                            <h3 class="section-label">Prescribed Medications</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 45%;">MEDICINE</th>
                                        <th style="width: 15%;">DOSAGE</th>
                                        <th style="width: 20%;">FREQUENCY</th>
                                        <th style="width: 10%;">DAYS</th>
                                        <th style="width: 10%; text-align: right;">QTY</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${medicines
      .map(
        (med: any) => `
                                    <tr>
                                      <td>
                                        <div class="med-name">${med.name}</div>
                                      </td>
                                      <td class="med-meta">${typeof med.dosage === 'object' && med.dosage !== null ? `${med.dosage.morning || 0}-${med.dosage.afternoon || 0}-${med.dosage.evening || 0}-${med.dosage.night || 0}` : (med.dosage || "-")}</td>
                                      <td class="med-meta">${typeof (med.freq || med.frequency) === 'object' ? formatFrequency(med.freq || med.frequency) : (med.freq || med.frequency || "-")}</td>
                                      <td class="med-meta">${med.duration || "-"}</td>
                                      <td class="med-meta" style="text-align: right;">${calcQty(med)}</td>
                                    </tr>
                                    `,
      )
      .join("")}
                                </tbody>
                            </table>
                        </div>

                        <!-- Instructions & Follow-up Box -->
                        <div class="info-box">
                            <div>
                                <strong style="color: #64748b; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">SPECIAL INSTRUCTIONS:</strong>
                                <span style="font-weight: 600; color: #1e293b;">${prescription.notes || prescription.advice || "N/A"}</span>
                            </div>
                            ${followUpFormatted
      ? `
                            <div>
                                <strong style="color: #64748b; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">NEXT REVIEW ON:</strong>
                                <span style="font-weight: 800; color: #0284c7;">${followUpFormatted}</span>
                            </div>
                            `
      : ""
    }
                        </div>

                        <!-- Signatory Line matching Screenshot 1 -->
                        <div class="signatory-container">
                            <div class="signatory-box">
                                <div class="sig-line">${formattedDocName}</div>
                                <div class="sig-subtitle">AUTHORISED SIGNATORY</div>
                            </div>
                        </div>
                    </div>

                    <!-- Branded Hospital Footer pinned to bottom -->
                    <div style="margin-top: auto; padding-top: 15px;">
                        ${footerHtml || ""}
                    </div>
                </div>
            </body>
            </html>
    `;
};

export const generateLabTokenHtml = (data: any) => {
  const { hospital, patient, doctor, labToken, headerHtml, footerHtml } = data;
  const tests = labToken.tests || [];
  const priority = labToken.priority || "routine";
  const notes = labToken.notes;

  const formatDoctorName = (name: string) => {
    if (!name) return "Unknown Doctor";
    return name.toLowerCase().startsWith("dr") ? name : `Dr. ${name}`;
  };

  const patientName = formatPatientNameWithPrefix(
    patient.name || patient.user?.name,
    patient.honorific || patient.profile?.honorific || patient.honorificTitle
  );
  const ageDisplay = computeAgeFromDob(patient.dob, patient.age, patient.ageUnit);
  const genderDisplay =
    patient.gender && patient.gender !== "-"
      ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
      : "N/A";

  return `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Lab Token</title>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
              
              @media print {
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 10mm 12mm 10mm 12mm; }
              }
              html, body {
                height: 100%;
                margin: 0;
                padding: 0;
              }
              body { 
                font-family: 'Inter', Arial, sans-serif; 
                background: white;
                display: flex;
                flex-direction: column;
                min-height: 100vh;
                color: #1e293b;
              }
              .container {
                width: 210mm;
                min-height: 296mm;
                margin: 0 auto;
                padding: 15mm 20mm;
                box-sizing: border-box;
                flex: 1;
                display: flex;
                flex-direction: column;
              }
              
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 15px;
                border-radius: 8px;
                overflow: hidden;
              }
              th { 
                text-align: left; 
                padding: 14px 10px; 
                border-bottom: 2.5px solid #9333ea; 
                color: #4b5563; 
                font-size: 11px; 
                font-weight: 800;
                text-transform: uppercase; 
                letter-spacing: 1px;
                background-color: #fdfaff;
              }
              td { 
                padding: 14px 10px; 
                border-bottom: 1.5px solid #f1f5f9; 
                font-size: 12px; 
                color: #334155;
                vertical-align: middle;
              }
              th:nth-child(1), td:nth-child(1) { width: 40px; }
              th:nth-child(2), td:nth-child(2) { font-weight: 700; }
              th:nth-child(3), td:nth-child(3) { width: 130px; }
              th:nth-child(4), td:nth-child(4) { width: 140px; }
              th:nth-child(5), td:nth-child(5) { text-align: right; width: 120px; font-weight: 700; }

              .priority {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 8px;
              }
              .priority-urgent { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
              .priority-routine { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
              
              .token-badge {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                padding: 14px 24px;
                border-radius: 14px;
                border: 1px solid #e2e8f0;
                text-align: center;
                min-width: 120px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              }
              .token-label {
                font-size: 10px;
                font-weight: 800;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin: 0;
              }
              .token-number {
                font-size: 22px;
                font-weight: 900;
                color: #1e40af;
                margin: 4px 0 0;
                letter-spacing: 1px;
              }

              .return-btn {
                padding: 10px 24px;
                background-color: #000;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                font-family: inherit;
                width: 100%;
                max-width: 400px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
              }

              .footer-push {
                margin-top: auto;
              }

              @media print {
                .no-print { display: none !important; }
                .container { border: none; }
              }
            </style>
            ${!usePrintStore.getState().printWithHeader ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
        .print-settings-toggle-wrapper { visibility: visible !important; }
      </style>
      ` : ''}
    </head>
          <body onload="window.print();">
            <script>
                window.onafterprint = function() {
                    setTimeout(() => {
                        window.location.replace('${data.returnUrl || "/helpdesk"}');
                    }, 500);
                };
            </script>
            <div class="no-print">
                <button onclick="window.location.replace('${data.returnUrl || "/helpdesk"}')" class="return-btn">
                    ← BACK TO HOSPITAL DASHBOARD
                </button>
            </div>
            <div class="container">
              ${headerHtml ||
    `
              <div class="header">
                  <h1 style="color: #9333ea; margin: 0; font-size: 24px;">LAB REQUISITION</h1>
                  <h2 style="margin: 8px 0; font-size: 18px;">${hospital.name || "CureChain Medical Center"}</h2>
                  <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">Department of Pathology & Radiodiagnosis</p>
              </div>
              `
    }

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 16px; background: #fff; border: 1.5px solid #f1f5f9; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                  <div>
                      <h1 style="color: #1e40af; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">LAB REQUISITION</h1>
                      <p style="margin: 6px 0; font-size: 12px; color: #64748b;"><strong>Date:</strong> ${new Date(labToken.createdAt).toLocaleDateString("en-GB")}</p>
                      <span class="priority priority-${priority}">${priority}</span>
                  </div>
                  <div class="token-badge">
                      <p class="token-label">TOKEN</p>
                      <p class="token-number">${labToken.tokenNumber}</p>
                  </div>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <p style="margin: 0; font-size: 13px;"><strong>Patient:</strong> <span style="margin-left: 8px; color: #1e293b; font-weight: 600;">${patientName}</span></p>
                <p style="margin: 0; font-size: 13px;"><strong>Age/Gender:</strong> <span style="margin-left: 8px; color: #1e293b;">${ageDisplay} / ${genderDisplay}</span></p>
                <p style="margin: 0; font-size: 13px;"><strong>MRN:</strong> <span style="margin-left: 8px; color: #1e293b; font-family: monospace; font-weight: 700;">${patient.mrn || "N/A"}</span></p>
                <p style="margin: 0; font-size: 13px;"><strong>Ordering Physician:</strong> <span style="margin-left: 8px; color: #1e293b;">${formatDoctorName(doctor.name)}</span></p>
              </div>

              <h3 style="color: #9333ea; font-size: 15px; margin-bottom: 8px; font-weight: 800; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">CLINICAL INVESTIGATIONS</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Instructions</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${tests
      .filter((t: any) => t.name.trim())
      .map(
        (test: any, idx: number) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${test.name}</td>
                      <td>${test.category || "N/A"}</td>
                      <td style="font-style: italic; color: #64748b;">${test.instructions || "Standard Procedures"}</td>
                      <td>Rupees ${(parseFloat(String(test.price || test.testPrice || test.amount || test.test?.price || test.testId?.price || 0)) || 0).toFixed(2)}</td>
                    </tr>
                  `,
      )
      .join("")}
                </tbody>
              </table>

              ${notes
      ? `<div style="background: #fdfaff; padding: 16px; border-left: 4px solid #9333ea; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 800; font-size: 13px; color: #9333ea; text-transform: uppercase; letter-spacing: 0.5px;">Physician Remarks:</p>
                <p style="margin: 8px 0 0 0; font-style: italic; color: #475569; line-height: 1.5;">${notes}</p>
              </div>`
      : ""
    }

              <div class="footer-push">
                <div style="text-align: right; margin-top: 50px;">
                  <div style="width: 200px; border-bottom: 1.5px solid #000; margin-left: auto; margin-bottom: 6px;"></div>
                  <p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569;">Medical Officer Signature</p>
                </div>

                ${footerHtml ||
    `
                <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 8px; text-align: center; font-size: 8px; color: #9ca3af;">
                  <p style="margin: 0;">Generated by MsCureChain • ${new Date().toLocaleDateString("en-GB")} at ${formatTime12Hr(new Date())}</p>
                </div>
                `
    }
              </div>
            </div>
          </body>
          </html>
    `;
};

export const generateLabReportHtml = (data: any) => {
  const { hospital, patient, doctor, labSample, labInfo, labSettings } = data;

  const defaultLab = {
    name:
      labInfo?.name ||
      labSettings?.name ||
      data.labName ||
      "MEDI LAB LABORATORY",
    address:
      labInfo?.address ||
      labSettings?.address ||
      data.labAddress ||
      "123 Medical Plaza, Healthcare District",
    phone:
      labInfo?.phone ||
      labSettings?.phone ||
      data.labPhone ||
      "+91 98765 43210",
    email:
      labInfo?.email ||
      labSettings?.email ||
      data.labEmail ||
      "lab@mscurechain.com",
    logo:
      labInfo?.logo ||
      labSettings?.logo ||
      data.labLogo ||
      "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=150&auto=format&fit=crop&q=80",
  };

  const formattedPatientName = formatPatientNameWithPrefix(
    patient?.name || patient?.user?.name || data.patientName || "PATIENT",
    patient?.honorific || patient?.profile?.honorific || patient?.honorificTitle || data.honorific,
    true
  );

  const rawAge =
    patient?.age ??
    patient?.profile?.age ??
    patient?.user?.age ??
    data.age ??
    "";
  let ageDisplay = "";
  if (rawAge !== "" && rawAge !== undefined && rawAge !== null && rawAge !== "N/A" && rawAge !== "-") {
    const cleanAgeStr = String(rawAge).trim();
    if (cleanAgeStr.match(/(Y|Years|Mos|Months|Days|Yr|Yrs)$/i)) {
      ageDisplay = cleanAgeStr;
    } else {
      ageDisplay = `${cleanAgeStr} Years`;
    }
  } else {
    const computed = computeAgeFromDob(
      patient?.dob || patient?.dateOfBirth || patient?.user?.dob || patient?.profile?.dob,
      rawAge,
      patient?.ageUnit
    );
    if (computed && computed !== "N/A") {
      ageDisplay = computed;
    }
  }

  const rawGender =
    patient?.gender ||
    patient?.profile?.gender ||
    patient?.user?.gender ||
    data.gender ||
    "";
  let genderDisplay = "-";
  if (rawGender) {
    const gLower = String(rawGender).trim().toLowerCase();
    if (gLower.startsWith("m")) genderDisplay = "M";
    else if (gLower.startsWith("f")) genderDisplay = "F";
    else genderDisplay = String(rawGender).toUpperCase();
  }

  const tests = labSample?.tests || data.tests || [];
  const sampleId =
    labSample?.sampleId ||
    data.sampleId ||
    labSample?.tokenNumber ||
    data.tokenNumber ||
    data._id ||
    "SMP-0238";
  const sampleType = labSample?.sampleType || data.sampleType || "Blood, Urine";

  const rawRegDate = labSample?.createdAt || data.createdAt || new Date();
  const rawDrawnDate = labSample?.collectionDate || data.collectionDate || rawRegDate;
  const rawReportDate = labSample?.reportDate || data.reportDate || rawRegDate;

  const formatDateDisplay = (dt: any) => {
    if (!dt) return "-";
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return String(dt);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
    } catch {
      return String(dt);
    }
  };

  const regOnFormatted = formatDateDisplay(rawRegDate);
  const drawnOnFormatted = formatDateDisplay(rawDrawnDate);
  const reportedOnFormatted = formatDateDisplay(rawReportDate);

  const docName = doctor?.name || doctor?.user?.name || data.doctorName || "Dr. Ramesh";
  const formattedDocName = docName.toLowerCase().startsWith("dr") ? docName : `Dr. ${docName}`;

  const checkFlag = (result: string, rangeText?: string) => {
    if (!result) return "";
    const cleanStr = String(result).replace(/,/g, "").trim();
    if (cleanStr.includes("(L)") || cleanStr.includes("(H)")) return "";
    const val = parseFloat(cleanStr);
    if (!isNaN(val) && rangeText && rangeText !== "N/A" && rangeText !== "-" && rangeText !== "") {
      const cleanRange = String(rangeText).replace(/,/g, "").trim();
      const rangeMatch = cleanRange.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(-?\d+(?:\.\d+)?)$/i);
      if (rangeMatch) {
        const minVal = parseFloat(rangeMatch[1]);
        const maxVal = parseFloat(rangeMatch[2]);
        if (!isNaN(minVal) && val < minVal) return "(L) ";
        if (!isNaN(maxVal) && val > maxVal) return "(H) ";
      } else if (cleanRange.startsWith("<")) {
        const maxVal = parseFloat(cleanRange.substring(1).trim());
        if (!isNaN(maxVal) && val >= maxVal) return "(H) ";
      } else if (cleanRange.startsWith(">")) {
        const minVal = parseFloat(cleanRange.substring(1).trim());
        if (!isNaN(minVal) && val <= minVal) return "(L) ";
      }
    }
    return "";
  };

  const testsRowsHtml = tests
    .map((test: any) => {
      const testTitle =
        test.testName ||
        test.name ||
        test.test?.name ||
        test.title ||
        "INVESTIGATION";
      const subTests =
        test.subTests ||
        test.test?.subTests ||
        test.parameters ||
        [];

      let rows = `
        <tr style="page-break-inside: avoid; break-inside: avoid;">
          <td colspan="4" style="padding: 12px 10px 6px; text-align: left;">
            <div style="
              display: inline-block;
              font-weight: 800;
              font-size: 13.5px;
              color: #1e293b;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 3px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">
              ${testTitle}
            </div>
          </td>
        </tr>
      `;

      if (subTests.length > 0) {
        rows += subTests
          .map((sub: any) => {
            const paramName = sub.name || sub.label || sub.parameter || "-";
            const rawRes = sub.result !== undefined && sub.result !== null ? String(sub.result) : (sub.value || "-");
            const range = sub.range || sub.referenceRange || sub.normalRange || "-";
            const unit = sub.unit || "-";
            const flag = checkFlag(rawRes, range);
            const isAbnormal =
              sub.isAbnormal ||
              flag !== "" ||
              rawRes.includes("(L)") ||
              rawRes.includes("(H)");

            return `
              <tr style="page-break-inside: avoid; break-inside: avoid; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 10px; font-size: 12px; color: #000; text-transform: uppercase; font-weight: 500;">
                  ${paramName}
                </td>
                <td style="padding: 6px 10px; font-size: 12px; font-weight: ${isAbnormal ? "900" : "600"}; color: ${isAbnormal ? "#dc2626" : "#000"};">
                  ${flag}${rawRes}
                </td>
                <td style="padding: 6px 10px; font-size: 12px; color: #64748b;">
                  ${unit}
                </td>
                <td style="padding: 6px 10px; font-size: 12px; color: #475569;">
                  ${range}
                </td>
              </tr>
            `;
          })
          .join("");
      } else {
        const rawRes = test.resultValue || test.result || "-";
        const range = test.normalRange || test.referenceRange || test.range || "-";
        const unit = test.unit || "-";
        const flag = checkFlag(rawRes, range);
        const isAbnormal =
          test.isAbnormal ||
          flag !== "" ||
          String(rawRes).includes("(L)") ||
          String(rawRes).includes("(H)");

        rows += `
          <tr style="page-break-inside: avoid; break-inside: avoid; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 10px; font-size: 12px; color: #000; text-transform: uppercase; font-weight: 500;">
              ${testTitle}
            </td>
            <td style="padding: 6px 10px; font-size: 12px; font-weight: ${isAbnormal ? "900" : "600"}; color: ${isAbnormal ? "#dc2626" : "#000"};">
              ${flag}${rawRes}
            </td>
            <td style="padding: 6px 10px; font-size: 12px; color: #64748b;">
              ${unit}
            </td>
            <td style="padding: 6px 10px; font-size: 12px; color: #475569;">
              ${range}
            </td>
          </tr>
        `;
      }

      if (test.remarks) {
        rows += `
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td colspan="4" style="padding: 4px 10px 10px; font-size: 11px; color: #555;">
              <strong>Remarks:</strong> ${test.remarks}
            </td>
          </tr>
        `;
      }

      return rows;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lab Report - ${formattedPatientName}</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          background: #ffffff;
          color: #000;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-container {
          width: 100%;
          max-width: 210mm;
          min-height: 295mm;
          height: 100%;
          margin: 0 auto;
          padding: 8mm 12mm;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
        }
        .report-top-content {
          flex: 1 0 auto;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .report-bottom-content {
          flex-shrink: 0;
          margin-top: auto;
          width: 100%;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 42px;
          color: rgba(0, 0, 0, 0.035);
          font-weight: 800;
          letter-spacing: 4px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }
        .lab-master-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
        }
        .lab-patient-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 8px 0 14px;
          font-size: 12px;
          background: #f8f9fa;
          padding: 10px 14px;
          border-radius: 4px;
          border: 1px solid #f1f5f9;
        }
        .info-row {
          display: grid;
          grid-template-columns: 115px 10px 1fr;
          margin-bottom: 3px;
        }
        .info-label {
          font-weight: 700;
          color: #334155;
        }
        .no-print {
          display: none;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <!-- Faded Center Watermark -->
        <div class="watermark">${defaultLab.name}</div>

        <div style="position: relative; z-index: 1; width: 100%; min-height: 100%; display: flex; flex-direction: column; justify-content: space-between; flex: 1 1 auto;">
          <!-- Top Section: Header, Patient Grid, Test Results Table -->
          <div class="report-top-content">
            <!-- Top Header Section matching HeaderPrint.tsx -->
            <div style="display: flex; align-items: center; justify-content: flex-start; padding: 4px 0 10px 0; gap: 20px; border-bottom: 4px solid #15803d; margin-bottom: 8px;">
              <div style="min-width: 90px; max-width: 130px; display: flex; align-items: center; justify-content: center;">
                <img src="${defaultLab.logo}" alt="Lab Logo" style="max-width: 100%; max-height: 80px; object-fit: contain;" />
              </div>
              <div style="height: 60px; width: 2px; background: #e2e8f0; flex-shrink: 0;"></div>
              <div style="display: flex; flex-direction: column; align-items: flex-start; flex: 1; gap: 2px;">
                <h1 style="font-size: 28px; font-weight: 900; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: -0.01em; line-height: 1.1;">
                  ${defaultLab.name}
                </h1>
                <div style="display: flex; align-items: center; gap: 6px; color: #1e3a8a; font-size: 12px; font-weight: 700; margin-top: 2px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#1e3a8a"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  <span>${defaultLab.email}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; margin-top: 2px;">
                  <p style="color: #475569; font-size: 11px; margin: 0; font-weight: 600;">${defaultLab.address}</p>
                  <div style="height: 11px; width: 1px; background-color: #cbd5e1;"></div>
                  <div style="display: flex; align-items: center; gap: 6px; color: #15803d; font-size: 11.5px; font-weight: 800;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#15803d"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.57 4.29c0-.55-.45-1-1-1H4.29c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.29c0-.55-.45-1-1-1z"/></svg>
                    <span>${defaultLab.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Centered Title -->
            <div style="text-align: center; font-weight: 900; margin: 6px 0; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: #0f172a;">
              TEST REPORT
            </div>

            <!-- 2-Column Info Grid matching LabReportTemplate.tsx -->
            <div class="lab-patient-grid">
              <div>
                <div class="info-row"><span class="info-label">Reg No</span><span>:</span><span style="font-weight: 800; font-family: monospace;">${sampleId}</span></div>
                <div class="info-row"><span class="info-label">Patient Name</span><span>:</span><span style="font-weight: 800; text-transform: uppercase;">${formattedPatientName}</span></div>
                <div class="info-row"><span class="info-label">Age</span><span>:</span><span style="font-weight: 600;">${ageDisplay || "-"}</span></div>
                <div class="info-row"><span class="info-label">Gender</span><span>:</span><span style="font-weight: 600;">${genderDisplay}</span></div>
                <div class="info-row"><span class="info-label">Ref By</span><span>:</span><span style="font-weight: 600;">${formattedDocName}</span></div>
                <div class="info-row"><span class="info-label">Ref By Client</span><span>:</span><span style="color: #64748b;">_</span></div>
              </div>
              <div>
                <div class="info-row"><span class="info-label">Reg On</span><span>:</span><span style="font-weight: 600;">${regOnFormatted}</span></div>
                <div class="info-row"><span class="info-label">Sample Drawn On</span><span>:</span><span style="font-weight: 600;">${drawnOnFormatted}</span></div>
                <div class="info-row"><span class="info-label">Reported On</span><span>:</span><span style="font-weight: 600;">${reportedOnFormatted}</span></div>
                <div class="info-row"><span class="info-label">Sample Type</span><span>:</span><span style="font-weight: 600;">${sampleType}</span></div>
                <div class="info-row"><span class="info-label">Report Status</span><span>:</span><span style="font-weight: 700; color: #0284c7;">Final</span></div>
              </div>
            </div>

            <!-- Test Results Table -->
            <table class="lab-master-table">
              <thead>
                <!-- Table Headers matching Screenshot 3 -->
                <tr style="background: #f8fafc; border-bottom: 2px solid #1e293b;">
                  <th style="width: 35%; padding: 7px 10px; text-align: left; font-weight: 800; font-size: 11.5px; color: #000; text-transform: uppercase;">Parameter</th>
                  <th style="width: 25%; padding: 7px 10px; text-align: left; font-weight: 800; font-size: 11.5px; color: #000; text-transform: uppercase;">Result</th>
                  <th style="width: 15%; padding: 7px 10px; text-align: left; font-weight: 800; font-size: 11.5px; color: #000; text-transform: uppercase;">Units</th>
                  <th style="width: 25%; padding: 7px 10px; text-align: left; font-weight: 800; font-size: 11.5px; color: #000; text-transform: uppercase;">Reference Range</th>
                </tr>
              </thead>
              <tbody>
                ${testsRowsHtml || `
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 25px; color: #94a3b8; font-style: italic;">
                      No test results recorded.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Bottom Section: Signature & Footer pinned to downside -->
          <div class="report-bottom-content">
            <!-- Lab Incharge Signatory block matching Screenshot 3 -->
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 20px; margin-bottom: 10px; padding-right: 15px; page-break-inside: avoid;">
              <div style="text-align: center; min-width: 190px;">
                <div style="height: 35px;"></div>
                <div style="border-top: 1.5px solid #000; padding-top: 5px; font-weight: 800; font-size: 11px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
                  LAB INCHARGE SIGNATURE
                </div>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                  (Lab Technician / Incharge)
                </div>
              </div>
            </div>

            <!-- Footer matching FooterPrint.tsx -->
            <div style="width: 100%; margin-top: 8px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; border: none;">
                <tr>
                  <td style="width: 50%; background-color: #15803d; color: #ffffff; padding: 6px 14px; font-size: 11.5px; font-weight: 800; vertical-align: middle;">
                    📞 ${defaultLab.phone}
                  </td>
                  <td style="width: 50%; background-color: #1e3a8a; color: #ffffff; padding: 6px 14px; font-size: 11.5px; font-weight: 700; text-align: right; vertical-align: middle;">
                    ✉️ ${defaultLab.email}
                  </td>
                </tr>
              </table>
              <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: #64748b; line-height: 1.4; padding: 0 4px;">
                <div>
                  <div>• Results clinically correlation recommended</div>
                  <div>• Contact lab immediately for alarming results</div>
                </div>
                <div style="text-align: right;">
                  <div>• This is an authentic verified laboratory diagnostic document</div>
                  <div>• Page 1 of 1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateQualityReportHtml = (data: any) => {
  const {
    metrics,
    trends,
    month,
    year,
    hospital,
    targets,
    headerHtml,
    footerHtml,
  } = data;
  const T = targets || {
    opdWaitingTime: 30,
    bedOccupancyMin: 80,
    bedOccupancyMax: 90,
    alos: 5,
    billingTat: 180,
    incidentRateMax: 1.0,
    incidentCountMax: 5,
    readmissionRate: 5,
  };
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, month - 1),
  );
  const indicators = metrics?.indicators || {};
  const gaps = metrics?.dataGaps || {};
  const useRawIncidents = (metrics?.rawCounts?.totalOccupiedBedDays ?? 0) < 30;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NABH Quality Report - ${monthName} ${year}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body { 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
          color: #1e293b; 
          line-height: 1.3; 
          font-size: 11px; 
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
        .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; font-weight: 600; text-transform: uppercase; }
        
        .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #fff; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .meta-item label { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
        .meta-item value { display: block; font-size: 11px; font-weight: 700; color: #0f172a; }
        

        /* Removed dark background, kept clean layout */
        .score-box { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .score-val { font-size: 24px; font-weight: 900; color: #0f172a; }
        .score-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }

        .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; color: #0f172a; border-left: 3px solid #0f172a; padding-left: 8px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
        th { text-align: left; padding: 8px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 9px; font-weight: 700; color: #475569; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        
        /* Text-only status colors */
        .status-text { font-weight: 800; text-transform: uppercase; font-size: 9px; }
        .success { color: #16a34a; }
        .danger { color: #ef4444; }
        .warning { color: #f59e0b; }
        
        .footer { margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; color: #94a3b8; font-size: 9px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .sign-line { width: 150px; border-top: 1px solid #0f172a; padding-top: 5px; text-align: center; font-weight: 700; font-size: 10px; text-transform: uppercase; }
      </style>
      ${!usePrintStore.getState().printWithHeader ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
        .print-settings-toggle-wrapper { visibility: visible !important; }
      </style>
      ` : ''}
    </head>
    <script>
      window.onafterprint = () => {
        setTimeout(() => {
          window.close();
        }, 500);
      };
    </script>
    <body onload="window.print();">
      ${headerHtml ||
    `<div class="header">
        <h1 class="title">${hospital?.name || "CureChain Hospital"}</h1>
      </div>`
    }

      <div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase;">NABH QUALITY INDICATOR AUDIT REPORT</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <label>Hospital Unit</label>
          <value>${hospital?.name || "CureChain Hospital"}</value>
        </div>
        <div class="meta-item">
          <label>Report Period</label>
          <value>${monthName} ${year}</value>
        </div>
        <div class="meta-item">
          <label>Governance Status</label>
          <value>${metrics?.status === "locked" ? "FINALIZED & VERIFIED" : "OPEN FOR REVIEW"}</value>
        </div>
        <div class="meta-item">
          <label>Verified By</label>
          <value>${metrics?.lockedBy?.name || "Pending"}</value>
        </div>
      </div>

      <div class="score-box">
        <div>
          <div class="score-label">Overall Compliance Score</div>
          <div class="score-val">${metrics?.complianceScore || 0}%</div>
        </div>
        <div style="text-align: right;">
          <div class="score-label">Total Data Gaps</div>
          <div class="score-val" style="color: ${(gaps.missingDiagnoses || 0) + (gaps.untrackedInfections || 0) + (gaps.emptyArrivalTimes || 0) > 0 ? "#ef4444" : "#16a34a"};">
            ${(gaps.missingDiagnoses || 0) + (gaps.untrackedInfections || 0) + (gaps.emptyArrivalTimes || 0)}
          </div>
        </div>
      </div>

      <div class="section-title">Key Performance Indicators</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40%">Indicator</th>
            <th style="width: 20%">Target</th>
            <th style="width: 20%">Actual Value</th>
            <th style="width: 20%">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>OPD Waiting Time</strong><br><span style="color:#64748b; font-size:8px">Registration to Consultation</span></td>
            <td>&lt; ${T.opdWaitingTime} min</td>
            <td style="font-weight:700">${indicators.opdWaitingTime || 0} min</td>
            <td><span class="status-text ${indicators.opdWaitingTime < T.opdWaitingTime ? "success" : "danger"}">${indicators.opdWaitingTime < T.opdWaitingTime ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
          <tr>
            <td><strong>Bed Occupancy Rate</strong><br><span style="color:#64748b; font-size:8px">Utilized vs Available Beds</span></td>
            <td>${T.bedOccupancyMin}-${T.bedOccupancyMax}%</td>
            <td style="font-weight:700">${indicators.bedOccupancyRate || 0}%</td>
            <td>${(() => {
      const v = indicators.bedOccupancyRate || 0;
      const ok = v >= T.bedOccupancyMin && v <= T.bedOccupancyMax;
      const cls = ok ? "success" : "danger";
      const lbl = ok
        ? "COMPLIANT"
        : v < T.bedOccupancyMin
          ? "LOW OCCUPANCY"
          : "NON-COMPLIANT";
      return `<span class="status-text ${cls}">${lbl}</span>`;
    })()}</td>
          </tr>
          <tr>
            <td><strong>Avg Length of Stay (ALOS)</strong><br><span style="color:#64748b; font-size:8px">Admission to Discharge</span></td>
            <td>&lt; ${T.alos} days</td>
            <td style="font-weight:700">${indicators.alos || 0} days</td>
            <td><span class="status-text ${indicators.alos < T.alos ? "success" : "danger"}">${indicators.alos < T.alos ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
          <tr>
            <td><strong>Billing TAT</strong><br><span style="color:#64748b; font-size:8px">Discharge Advice to Settlement</span></td>
            <td>&lt; ${T.billingTat} min</td>
            <td style="font-weight:700">${indicators.billingTat || 0} min</td>
            <td>${(() => {
      const v = indicators.billingTat;
      if (v === undefined || v === null || v === 0)
        return `<span class="status-text warning">NO DATA</span>`;
      return `<span class="status-text ${v < T.billingTat ? "success" : "danger"}">${v < T.billingTat ? "COMPLIANT" : "NON-COMPLIANT"}</span>`;
    })()}</td>
          </tr>
          <tr>
            <td><strong>Incident Rate</strong><br><span style="color:#64748b; font-size:8px">${useRawIncidents ? "Total reported incidents this month" : "Per 1000 Patient Days"}</span></td>
            <td>&lt; ${useRawIncidents ? `${T.incidentCountMax} /mo` : `${T.incidentRateMax}\u2030`}</td>
            <td style="font-weight:700">${useRawIncidents ? metrics?.rawCounts?.totalIncidents || 0 : indicators.incidentRate || 0}${useRawIncidents ? "" : "\u2030"}</td>
            <td>${(() => {
      const compliant = useRawIncidents
        ? (metrics?.rawCounts?.totalIncidents || 0) < T.incidentCountMax
        : (indicators.incidentRate || 0) < T.incidentRateMax;
      return `<span class="status-text ${compliant ? "success" : "danger"}">${compliant ? "COMPLIANT" : "NON-COMPLIANT"}</span>`;
    })()}</td>
          </tr>
          <tr>
            <td><strong>Readmission Rate</strong><br><span style="color:#64748b; font-size:8px">Same Diagnosis within 30 days</span></td>
            <td>&lt; ${T.readmissionRate}%</td>
            <td style="font-weight:700">${indicators.readmissionRate || 0}%</td>
            <td><span class="status-text ${indicators.readmissionRate < T.readmissionRate ? "success" : "danger"}">${indicators.readmissionRate < T.readmissionRate ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Data Quality Audit</div>
      <table>
        <thead>
          <tr>
            <th style="width: 60%">Audit Checkpoint</th>
            <th style="width: 20%">Count</th>
            <th style="width: 20%">Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Missing Discharge Diagnoses</td>
            <td>${gaps.missingDiagnoses || 0}</td>
            <td><span class="status-text ${gaps.missingDiagnoses > 0 ? "danger" : "success"}">${gaps.missingDiagnoses > 0 ? "HIGH" : "NONE"}</span></td>
          </tr>
          <tr>
            <td>Untracked Surgical Infections</td>
            <td>${gaps.untrackedInfections || 0}</td>
            <td><span class="status-text ${gaps.untrackedInfections > 0 ? "danger" : "success"}">${gaps.untrackedInfections > 0 ? "CRITICAL" : "NONE"}</span></td>
          </tr>
          <tr>
            <td>Empty OPD Arrival Timestamps</td>
            <td>${gaps.emptyArrivalTimes || 0}</td>
            <td><span class="status-text ${gaps.emptyArrivalTimes > 0 ? "warning" : "success"}">${gaps.emptyArrivalTimes > 0 ? "LOW" : "NONE"}</span></td>
          </tr>
        </tbody>
      </table>


      <div class="signatures">
        <div class="sign-line">Quality Manager</div>
        <div class="sign-line">Medical Superintendent</div>
      </div>

      <div style="margin-top: auto;">
        ${footerHtml ||
    `<div class="footer">
          CureChain Hospital Management System | Generated on ${new Date().toLocaleDateString("en-GB")} at ${formatTime12Hr(new Date())}
        </div>`
    }
      </div>
    </body>
    </html>
  `;
};

export const generateBlankLetterheadHtml = (data: any) => {
  const { hospital } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Letterhead - ${hospital.name}</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
          }
          .no-print { display: none !important; }
        }

        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          line-height: 1.3;
          margin: 0;
          padding: 0;
          background: white;
          font-size: 10px;
        }

        /* Repeating Branding Elements */
        .page-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 8mm 10mm 0;
          background: white;
          z-index: 1000;
        }

        .page-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 10mm 8mm;
          background: white;
          z-index: 1000;
        }

        /* EXACT Header Style from Clinical Receipt (Lines 747-772) */
        .hospital-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 10px;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 10px;
        }
        .hospital-details {
          text-align: left;
          flex: 1;
        }
        .hospital-name {
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
          color: #1e293b;
          letter-spacing: -0.5px;
        }
        .hospital-info {
          font-size: 10px;
          margin: 2px 0;
          color: #64748b;
          font-weight: 500;
        }

        /* EXACT Footer Style from Clinical Receipt (Lines 906-931) */
        .footer {
          padding-top: 8px;
          border-top: 2px solid #1e293b;
          font-size: 9.5px;
          color: #64748b;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10px;
        }
        .signatory-box {
          text-align: center;
        }
        .sign-line {
          width: 180px;
          border-bottom: 1px solid #1e293b;
          margin-bottom: 8px;
        }
        .authorized-text {
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          color: #1e293b;
        }

        /* Spacing Logic for Multi-page */
        .report-table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-space { height: 135px; }
        .footer-space { height: 110px; }

        .content-area {
          padding: 10px 10mm;
          min-height: 400px;
        }

        .no-print {
          position: sticky;
          top: 0;
          background: white;
          padding: 15px;
          z-index: 2000;
          border-bottom: 2px solid #0f172a;
          text-align: center;
        }
        .print-btn {
          padding: 10px 24px;
          background-color: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      </style>
      ${!usePrintStore.getState().printWithHeader ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
      </style>
      ` : ''}
    </head>
    <body onload="window.print()">
      <div class="no-print">
        <button onclick="window.print()" class="print-btn">PRINT HOSPITAL TEMPLATE</button>
        <button onclick="window.close()" class="print-btn" style="background-color: #64748b; margin-left: 10px;">CLOSE WINDOW</button>
      </div>

      <!-- Static Page Header -->
      <div class="page-header">
        <div class="hospital-header">
          ${hospital.logo ? `<img src="${hospital.logo}" alt="Logo" style="max-height: 85px; width: auto; object-fit: contain;" />` : ""}
          <div class="hospital-details">
            <h1 class="hospital-name">${hospital.name}</h1>
            <p class="hospital-info">${hospital.address || ""}</p>
            <p class="hospital-info">${hospital.contact ? `Phone: ${hospital.contact}` : ""} ${hospital.email ? ` | Email: ${hospital.email}` : ""}</p>
          </div>
        </div>
      </div>

      <!-- Static Page Footer -->
      <div class="page-footer">
        <div class="footer">
          <div style="flex: 1;">
            <p style="margin: 0; font-weight: 700;">HOSPITAL MANAGEMENT SYSTEM</p>
            <p style="margin: 4px 0 0 0;">Official Branded Hospital Letterhead</p>
            <p style="margin: 2px 0 0 0;">Generated on ${new Date().toLocaleDateString("en-GB")} at ${formatTime12Hr(new Date())}</p>
          </div>
          <div class="signatory-box">
            <div class="sign-line"></div>
            <div class="authorized-text">Authorized Signatory</div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; margin-top: 2px;">${hospital.name.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr><td><div class="header-space"></div></td></tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="content-area">
                <!-- Blank Content Area -->
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td><div class="footer-space"></div></td></tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
};

export const generateAddBillsReceiptHtml = (data: any) => {
  const { hospital, patient, items, payment, preparedBy, appointment } = data;
  const formattedPatientName = formatPatientNameWithPrefix(
    patient?.name || patient?.user?.name,
    (appointment && (appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific)) || patient?.honorific || patient?.profile?.honorific
  );

  let ageDisplay = "N/A";
  if (patient?.age !== undefined && patient?.age !== null && String(patient?.age).trim() !== "" && String(patient?.age).trim() !== "N/A") {
    const ageStr = String(patient.age).trim();
    if (ageStr.match(/(Y|Mos|Days|Month|Day|Yr|Yrs|Months|Years)$/i)) {
      ageDisplay = ageStr;
    } else {
      ageDisplay = `${ageStr} Y`;
    }
  } else if (patient?.dob) {
    ageDisplay = computeAgeFromDob(patient.dob, patient.age, patient.ageUnit);
  }

  const billDateObj = parseSafeDate(payment?.date || (payment as any)?.createdAt) || new Date();
  const billDateFormatted = billDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const billTimeFormatted = billDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const doctorDisplay = patient?.refDoctor || (appointment?.doctorName ? `Dr. ${appointment.doctorName.replace(/^Dr\.?\s*/i, '')}` : "Self / Walk-in");
  const receiptNumber = payment?.receiptNo || payment?.receiptNumber || "N/A";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hospital Bill - ${formattedPatientName}</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; }
        html, body { height: 100%; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.3; font-size: 10px; background: white; }
        
        .header-wrapper, .footer-wrapper { width: 100%; background: white; z-index: 1000; box-sizing: border-box; }
        
        @media print {
          @page { size: A4; margin: 6mm 8mm; }
          body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .print-header-spacer { height: 165px !important; display: block !important; }
          .print-footer-spacer { height: 160px !important; display: block !important; }
          .header-wrapper { position: fixed; top: 0; left: 0; right: 0; padding: 0 4mm; }
          .footer-wrapper { position: fixed; bottom: 0; left: 0; right: 0; padding: 0 4mm; }
          .receipt-container { padding: 0 4mm; }
        }
        
        @media screen {
          .no-print { display: block; margin: 15px auto; text-align: center; }
          .header-wrapper, .footer-wrapper { position: static !important; }
          .print-header-spacer, .print-footer-spacer { display: none !important; }
          .receipt-container { padding: 20px; max-width: 800px; margin: 0 auto; }
        }
        
        .bill-title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding: 6px 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .bill-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #1e40af; letter-spacing: -0.3px; }
        
        .section-header { font-size: 9px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; border-bottom: 2px solid #e2e8f0; padding-bottom: 2px; color: #334155; }
        .payment-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .payment-table th, .payment-table td { padding: 6px 12px; border: 1px solid #f1f5f9; text-align: left; font-size: 11px; }
        .payment-table th { background-color: #fef3c7; color: #92400e; font-weight: 800; text-transform: uppercase; font-size: 10px; }
        .total-row td { font-weight: 900; font-size: 12px; background-color: #f8fafc; border-top: 2px solid #1e293b !important; }
        
        .signatory-box { text-align: left; }
        .sign-line { width: 160px; border-bottom: 1px solid #1e293b; margin-bottom: 6px; }
        .authorized-text { font-weight: 800; text-transform: uppercase; font-size: 9px; color: #1e293b; }
        
        .return-btn { padding: 10px 24px; background-color: #0f172a; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; }
      </style>
      ${!usePrintStore.getState().printWithHeader ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
      </style>
      ` : ''}
    </head>
    <body onload="window.print();">
      <script>
        window.onafterprint = function() { setTimeout(() => { window.close(); }, 500); };
      </script>
      <div class="no-print" style="background: white; padding: 10px; border-bottom: 2px solid #0f172a; text-align: center;">
         <button onclick="window.close()" class="return-btn" style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px;">&#8592; CLOSE RECEIPT</button>
      </div>

      <div class="header-wrapper">
        <div style="position: relative; width: 100%;" class="main-header-print-container">
            <div style="width: 100%; background-color: #ffffff; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-bottom: 8px; padding: 0; box-sizing: border-box;">
                <div style="display: flex; align-items: center; justify-content: flex-start; gap: 16px; padding: 4px 0; width: 100%; box-sizing: border-box;">
                    <!-- Logo Section -->
                    <div style="flex: 0 0 auto;">
                        ${hospital?.logo ? `
                            <img src="${hospital.logo}" alt="Hospital Logo" style="width: 80px; height: 80px; object-fit: contain;" />
                        ` : `
                            <div style="width: 75px; height: 75px; border: 1.5px solid #1e3a8a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-size: 10px; font-weight: bold; text-transform: uppercase;">LOGO</div>
                        `}
                    </div>

                    <!-- Vertical Divider Line -->
                    <div style="width: 2px; height: 60px; background-color: #1e3a8a; opacity: 0.15;"></div>

                    <!-- Details Section -->
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                        <h1 style="margin: 0; font-weight: 900; color: #1e3a8a; line-height: 1.1; font-size: 24px; text-transform: uppercase; letter-spacing: -0.5px;">
                            ${hospital?.name || 'Hospital Name'}
                        </h1>
                        
                        ${hospital?.email && hospital.email !== 'N/A' && hospital.email !== 'Email Address' ? `
                            <div style="display: flex; align-items: center; gap: 5px; color: #1e40af; font-size: 11px; font-weight: 700; margin-top: 1px;">
                                <div style="width: 12px; height: 12px; background-color: #1e3a8a; border-radius: 2px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                </div>
                                <span>${hospital.email}</span>
                            </div>
                        ` : ''}

                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 10px; color: #475569; font-weight: 600; margin-top: 1px; width: 100%;">
                            ${hospital?.address && hospital.address !== 'N/A' && hospital.address !== 'Hospital Address' ? `
                                <span style="color: #64748b;">${hospital.address}</span>
                            ` : ''}

                            ${hospital?.phone && hospital.phone !== 'N/A' && hospital.phone !== 'Phone Number' ? `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <div style="width: 14px; height: 14px; background-color: #22c55e; border-radius: 3px; display: flex; align-items: center; justify-content: center;">
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    </div>
                                    <span style="color: #16a34a; font-weight: 800;">${hospital.phone}</span>
                                </div>
                            ` : ''}

                            ${hospital?.gstNumber && hospital.gstNumber !== 'N/A' ? `
                                <span style="color: #1e3a8a; font-weight: 800;">
                                    GST No: ${hospital.gstNumber}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Bottom Accent line -->
                <div style="width: 100%; height: 3px; background-color: #10b981; margin-top: 6px; border-radius: 2px;"></div>
            </div>
        </div>
      </div>

      <div class="footer-wrapper">
        <div style="width: 100%; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 10px; padding: 0;">
            <!-- Contact Badges -->
            <div style="display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; width: 100%; margin-bottom: 10px;">
                ${hospital?.phone && hospital.phone !== 'N/A' && hospital.phone !== 'Phone Number' ? `
                    <div style="flex: 1; min-width: 140px; background: #22c55e; color: #ffffff; display: flex; align-items: center; justify-content: flex-start; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 12px; letter-spacing: 0.3px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        ${hospital.phone}
                    </div>
                ` : ''}

                ${hospital?.email && hospital.email !== 'N/A' && hospital.email !== 'Email Address' ? `
                    <div style="flex: 1; min-width: 140px; background: #3b82f6; color: #ffffff; display: flex; align-items: center; justify-content: flex-start; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 12px; letter-spacing: 0.3px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        ${hospital.email}
                    </div>
                ` : ''}
            </div>

            <!-- Signatory & Full Address -->
            <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end; width: 100%; gap: 20px; margin-top: 6px;">
                <!-- Left: Signature Box -->
                <div style="flex: 0 0 auto;">
                  <div class="signatory-box">
                    <div class="sign-line"></div>
                    <div class="authorized-text">Authorized Signatory</div>
                    <div style="font-size: 8px; font-weight: 600; color: #64748b; margin-top: 1px;">${(hospital?.name || "Hospital Name").toUpperCase()}</div>
                  </div>
                </div>

                <!-- Right: Full Address -->
                <div style="flex: 1; text-align: right; min-width: 0;">
                    <p style="margin: 0; font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; line-height: 1.35; word-break: break-word;">
                        ${hospital?.address || ''}
                    </p>
                </div>
            </div>

            <!-- Footer Disclaimer -->
            <div style="text-align: center; font-size: 8.5px; color: #64748b; margin-top: 10px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-weight: 600;">
                <p style="margin: 0 0 2px 0;">PREPARED BY: ${preparedBy || "System Administrator"}</p>
                <p style="margin: 0 0 2px 0;">This is a computer generated document and does not require a physical signature.</p>
                <p style="margin: 0;">Print Date: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
            </div>
        </div>
      </div>

      <div class="receipt-container">
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr><td><div class="print-header-spacer"></div></td></tr></thead>
          <tbody>
            <tr>
              <td>
                <div class="bill-title-row">
                  <div>
                    <div class="bill-title">HOSPITAL BILLING RECEIPT</div>
                    <div style="font-size: 9.5px; color: #64748b; font-weight: 600; margin-top: 1px;">Comprehensive Billing Statement</div>
                  </div>
                  <div style="text-align: right; font-size: 10px; font-weight: 600; color: #475569;">
                    <div><strong>Date:</strong> ${billDateFormatted}</div>
                    <div><strong>Time:</strong> ${billTimeFormatted}</div>
                    <div><strong>Receipt No:</strong> ${receiptNumber}</div>
                  </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; right: 0; background: #1e293b; color: white; padding: 2px 8px; border-bottom-left-radius: 6px; font-size: 7.5px; font-weight: 900; letter-spacing: 0.5px;">PATIENT IDENTITY</div>
                    <div style="font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 6px;">${formattedPatientName}</div>
                    <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1.2fr; gap: 8px;">
                        <div>
                            <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">MRN / Mobile</div>
                            <div style="font-size: 9.5px; font-weight: 700; color: #1e293b;">${patient.mrn || (patient as any)?.mrnNumber || (patient as any)?.medicalRecordNumber || (patient as any)?.patientId || (patient as any)?.uhid || (patient as any)?.user?.mrn || (appointment as any)?.mrn || (appointment as any)?.patientDetails?.mrn || (appointment as any)?.patientMrn || (payment as any)?.mrn || (payment as any)?.patientMrn || (payment as any)?.referenceNode || (appointment as any)?.referenceNode || "N/A"} / ${patient.mobile || (patient as any)?.user?.mobile || "N/A"}</div>
                        </div>
                        <div>
                            <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Age / Gender</div>
                            <div style="font-size: 9.5px; font-weight: 700; color: #1e293b;">${ageDisplay} / ${patient.gender || "N/A"}</div>
                        </div>
                        <div>
                            <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Blood Group</div>
                            <div style="font-size: 9.5px; font-weight: 700; color: #e11d48;">${patient.bloodGroup || "Unknown"}</div>
                        </div>
                        <div>
                            <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Doctor / Ref</div>
                            <div style="font-size: 9.5px; font-weight: 700; color: #1e293b;">${doctorDisplay}</div>
                        </div>
                    </div>
                </div>

                <div class="section-header">Billing Items</div>
                <table class="payment-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style="text-align: right;">Amount (Rupees)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item: any) => `
                      <tr>
                        <td>${item.name || item.description || "Service / Item"}</td>
                        <td style="text-align: right;">₹ ${Math.round(item.amount || 0).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                    ${payment.discountAmount && payment.discountAmount > 0 ? `
                      <tr>
                        <td><strong>SUBTOTAL</strong></td>
                        <td style="text-align: right;">₹ ${Math.round(payment.subtotal || payment.amount).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="color: #059669; font-weight: 700;">
                          DISCOUNT ${payment.discountReason ? `(${payment.discountReason})` : ''}
                        </td>
                        <td style="text-align: right; color: #059669; font-weight: 700;">- ₹ ${Math.round(payment.discountAmount).toLocaleString()}</td>
                      </tr>
                      <tr class="total-row">
                        <td>NET AMOUNT PAYABLE</td>
                        <td style="text-align: right;">₹ ${Math.round(payment.amount).toLocaleString()}</td>
                      </tr>
                    ` : `
                      <tr class="total-row">
                        <td>TOTAL AMOUNT</td>
                        <td style="text-align: right;">₹ ${Math.round(payment.amount).toLocaleString()}</td>
                      </tr>
                    `}
                  </tbody>
                </table>
                <div style="margin-top: 8px; font-size: 9.5px; font-weight: 700; display: flex; justify-content: space-between; padding: 6px 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div>Payment Method: <span style="text-transform: uppercase;">${payment.method || "Cash"}</span></div>
                  <div style="color: #059669; text-transform: uppercase;">Payment Status: PAID</div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot><tr><td><div class="print-footer-spacer"></div></td></tr></tfoot>
        </table>
      </div>
    </body>
    </html>
  `;
};
