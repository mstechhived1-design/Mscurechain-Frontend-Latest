import { usePrintStore } from '@/stores/printStore';
import { formatDoctorName, formatPatientNameWithPrefix } from '@/lib/utils/name-utils';

export const computeAgeFromDob = (dob: any, fallbackAge: any, fallbackUnit: any) => {
    if (dob) {
        const birthDate = new Date(dob);
        if (!isNaN(birthDate.getTime())) {
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
                    return `${ageYears} Years ${ageMonths} Months`;
                }
                return `${ageYears} Years`;
            }
            if (ageMonths > 0) return `${ageMonths} Months`;
            if (ageDays > 0) return `${ageDays} Days`;
            return "0 Days";
        }
    }
    if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== "-" && fallbackAge !== "") {
        const unit = fallbackUnit ? (fallbackUnit === 'Months' ? 'Months' : fallbackUnit === 'Days' ? 'Days' : 'Years') : 'Years';
        // if fallbackAge already has Y/Mos/Days, just return it
        if (String(fallbackAge).match(/(Y|Mos|Days|Month|Day|Yr|Yrs)$/i)) return fallbackAge;
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
      ? `(From ${((d) => String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear())(new Date(rx.startDate))} To ${((d) => String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear())(new Date(rx.endDate))})`
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

export const generateOPDRegistrationSlipHtml = (data: any) => {
  const { hospital = {}, patient = {}, appointment = {}, payment = {}, headerHtml, footerHtml } = data;
  const ageDisplay = computeAgeFromDob(patient.dob, patient.age, patient.ageUnit) || patient.age || "N/A";
  const doctorTitle = formatDoctorName(appointment.doctorName);
  
  const formattedPatientName = formatPatientNameWithPrefix(
    patient.name || patient.user?.name,
    appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific || patient.honorific || patient.profile?.honorific || patient.honorificTitle
  );
  
  const rawToken = appointment.tokenNo || appointment.tokenNumber || appointment.token || appointment.queueNumber || appointment.dailyTokenNumber || (appointment.queuePosition !== undefined ? appointment.queuePosition : undefined) || (() => {
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
                         getSymptomsText(patient.chiefComplaint) || 
                         getSymptomsText(appointment.symptoms) || 
                         getSymptomsText(appointment.reason) || 
                         getSymptomsText(appointment.notes) || 
                         getSymptomsText(appointment.chiefComplaint) || 
                         getSymptomsText(appointment.reasonForVisit) || 
                         "N/A";
  
  const isIPD = data.registrationType === 'IPD' || (appointment.type && appointment.type.toUpperCase().includes('IPD'));
  const slipTitle = isIPD ? "IPD Admission Slip" : "OPD Registration Slip";
  const idLabel = isIPD ? "IPD.No." : "OP.No.";
  const tokenLabel = isIPD ? "Admission Token" : "Today's Token No";
  const visitTypeDisplay = appointment.type || (isIPD ? "IPD Admission" : "Registration");

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
    const day   = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year  = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  let baseVisitDate = new Date();
  if (appointment.date) {
    if (typeof appointment.date === 'string' && appointment.date.includes('/')) {
      const parts = appointment.date.split('/');
      if (parts.length === 3) {
        baseVisitDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else {
        baseVisitDate = new Date(appointment.date);
      }
    } else {
      baseVisitDate = new Date(appointment.date);
    }
  } else if (appointment.appointmentDate) {
    baseVisitDate = new Date(appointment.appointmentDate);
  }

  // Always use the live hospital admin's currently configured values!
  // Do not use the stored snapshot because admin might have updated the window duration.
  let followUpExpiryMsg = "";
  const liveEnableExpiry = hospital.enableFollowUpExpiry ?? true;
  const liveRangeDays    = isIPD ? hospital.ipdFollowUpDays : hospital.opdFollowUpDays;
  
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
          height: 100%;
          margin: 0;
          padding: 0;
          position: relative;
        }
        .footer-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 0 20px;
          box-sizing: border-box;
          z-index: 1000;
        }
        .footer-spacer {
          height: 220px;
        }
        @media print {
          body { padding: 0; margin: 0; }
          .footer-wrapper {
            position: fixed;
            bottom: 1px;
            left: 0;
            right: 0;
            background: white;
            padding: 0 5mm;
            box-sizing: border-box;
            z-index: 1000;
          }
          .footer-spacer {
            height: 220px; /* Reserve space equal to footer height + gap */
          }
        }
      </style>
      ${!usePrintStore.getState().printWithHeader ? `
      <style>
        .header-wrapper, .footer-wrapper, .hospital-header, .footer, .signatory-box, .signatory, .print-header, .print-footer, .header, .header-container, .divider-thick, .footer-note, .page-header, .footer-push { visibility: hidden !important; }
      </style>
      ` : ''}
    </head>
    <body onload="window.print();">
      <div class="header-wrapper">
        ${
          headerHtml ||
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
          <span class="value">${patient.dob ? new Date(patient.dob).toLocaleDateString('en-GB') : "N/A"}</span>
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
            <span style="font-size: 10px; font-weight: 800; color: #1e293b;">${(payment.method || 'CASH').toUpperCase()}</span>
          </div>
        </div>

        ${
          (payment.method || '').toUpperCase() === 'MIXED' && (payment.paymentDetails || payment.splitPayments || payment.breakdown)
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

      <div class="clinical-workspace" style="min-height: 300px;">
        <!-- Open space for doctor prescription notes -->
      </div>

      <!-- Reserve bottom space for fixed footer -->
      <div class="footer-spacer"></div>
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
    appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific || patient.honorific || patient.profile?.honorific || patient.honorificTitle
  );

  const isIPD = data.registrationType === 'IPD' || (appointment.type && appointment.type.toUpperCase().includes('IPD'));
  
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
    const day   = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year  = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const visitDateRaw  = appointment.date || appointment.appointmentDate || new Date();
  const baseVisitDate = new Date(visitDateRaw);

  let followUpExpiryMsg = "";
  const liveEnableExpiry = hospital.enableFollowUpExpiry ?? true;
  const liveRangeDays    = isIPD ? hospital.ipdFollowUpDays : hospital.opdFollowUpDays;
  
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
          .print-header-spacer {
            margin-bottom: 0 !important;
          }
          .print-footer-spacer {
            margin-top: 0 !important;
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
        
        ${
          headerHtml
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
        ${
          headerHtml ||
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
                      ${
                        patient.dischargeType || data.registrationType === "DISCHARGE"
                          ? "DISCHARGE SUMMARY & BILLING STATEMENT"
                          : data.registrationType === "IPD"
                            ? "IPD ADMISSION RECEIPT"
                            : (appointment.type?.toLowerCase() === 'follow-up'
                              ? "FOLLOW-UP APPOINTMENT RECEIPT"
                              : "PATIENT REGISTRATION BILL")
                      }
                    </div>
                    <div class="bill-subtitle">
                      ${
                        patient.dischargeType || data.registrationType === "DISCHARGE"
                          ? "Comprehensive Clinical Summary & Final Invoice"
                          : data.registrationType === "IPD"
                            ? "Hospital Admission Document"
                            : (appointment.type?.toLowerCase() === 'follow-up'
                              ? "Follow-up Consultation Slip"
                              : "Appointment Receipt")
                      }
                    </div>
                  </div>
                  <div class="bill-meta">
                    <div><strong>Date:</strong> ${payment.date ? new Date(payment.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : appointment.date}</div>
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
                                <div style="font-size: 10px; font-weight: 700; color: #1e293b;">${patient.mrn} / ${patient.mobile}</div>
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
                                 <div style="font-size: 10px; font-weight: 700; color: #1e293b;">${patient.dob ? new Date(patient.dob).toLocaleDateString("en-GB") : "N/A"}</div>
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
                ${
                  data.showVitals
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
                ${
                  (data.showVitals &&
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
                    ${
                      data.showVitals
                        ? `
                    <tr>
                      ${
                        patient.allergies &&
                        patient.allergies.length > 0 &&
                        patient.allergies !== "None" &&
                        patient.allergies !== "NONE"
                          ? `<td class="label" style="color: #e11d48; width:14%;">Allergies:</td>
                           <td class="value" style="color: #e11d48; width:36%;">
                             ${Array.isArray(patient.allergies) ? patient.allergies.join(", ") : patient.allergies}
                           </td>`
                          : `<td class="label" style="width:14%;">Allergies:</td><td class="value" style="width:36%;">-</td>`
                      }
                      ${
                        patient.medicalHistory &&
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
                    ${
                      symptomDisplay !== "N/A"
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
                ${
                  patient.dischargeType ||
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
                    ${
                      patient.dischargeType || data.registrationType === "DISCHARGE"
                        ? `
                    <tr>
                      <td class="label" style="width:20%; color: #1d4ed8; background-color: #eff6ff;">Discharge Status:</td>
                      <td colspan="3" class="value" style="font-weight: 800; color: #1d4ed8; background-color: #eff6ff;">${patient.dischargeType || "FINAL DISCHARGE"}</td>
                    </tr>`
                        : ""
                    }
                    
                    ${
                      patient.provisionalDiagnosis
                        ? `
                    <tr>
                      <td class="label" style="width:20%;">Provisional Diag:</td>
                      <td colspan="3" class="value">${patient.provisionalDiagnosis}</td>
                    </tr>`
                        : ""
                    }
                    
                    ${
                      patient.diagnosis
                        ? `
                    <tr>
                      <td class="label" style="width:20%;">Final Diagnosis:</td>
                      <td colspan="3" class="value" style="font-weight: 800; color: #1e293b; text-transform: uppercase;">${patient.diagnosis}</td>
                    </tr>`
                        : ""
                    }

                    ${
                      patient.hospitalCourse
                        ? `
                    <tr>
                      <td class="label" style="width:20%;">Hospital Course:</td>
                      <td colspan="3" class="value">${patient.hospitalCourse}</td>
                    </tr>`
                        : ""
                    }

                    ${
                      patient.investigationsPerformed
                        ? `
                    <tr>
                      <td class="label" style="width:20%;">Investigations:</td>
                      <td colspan="3" class="value">${patient.investigationsPerformed}</td>
                    </tr>`
                        : ""
                    }
                    
                    ${
                      patient.treatmentGiven
                        ? `
                    <tr>
                      <td class="label" style="width:20%; background-color: #f0fdf4;">Treatment Given:</td>
                      <td colspan="3" class="value" style="background-color: #f0fdf4;">${patient.treatmentGiven}</td>
                    </tr>`
                        : ""
                    }

                    ${
                      patient.surgicalProcedures
                        ? `
                    <tr>
                      <td class="label" style="width:20%;">Procedures Done:</td>
                      <td colspan="3" class="value">${patient.surgicalProcedures}</td>
                    </tr>`
                        : ""
                    }

                    ${
                      patient.medicationsPrescribed
                        ? `
                    <tr>
                      <td class="label" style="width:20%; background-color: #f0fdf4; color: #15803d;">Meds @ Discharge:</td>
                      <td colspan="3" class="value" style="font-family: inherit; white-space: pre-wrap; background-color: #f0fdf4; font-weight: 700;">${patient.medicationsPrescribed}</td>
                    </tr>`
                        : ""
                    }
                    
                    ${
                      patient.adviceAtDischarge ||
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

                    ${
                      patient.followUpDate ||
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

                    ${
                      patient.conditionAtDischarge
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
                      ${
                        patient.dischargeType ||
                        data.registrationType === "DISCHARGE" ||
                        (appointment.type &&
                          (appointment.type.includes("Settlement") ||
                            appointment.type.includes("Discharge")))
                          ? `
                        <tr>
                          <td style="font-weight: bold; color: #475569;">Advance Amount Paid</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.advanceAmount || 0).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style="font-weight: bold; color: #475569;">Remaining Amount Paid</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.remainingPaid || 0).toLocaleString()}</td>
                        </tr>
                        ${
                          Number(payment.discount || appointment.discount || 0) > 0
                            ? `
                        <tr style="color: #e11d48;">
                          <td style="font-weight: bold;">Discount Applied</td>
                          <td style="text-align: right; font-weight: 800;">- ₹ ${Math.round(Number(payment.discount || appointment.discount || 0)).toLocaleString()}</td>
                        </tr>`
                            : ""
                        }
                        <tr>
                          <td style="font-weight: bold; color: #1e40af;">Total Amount Paid</td>
                          <td style="text-align: right; font-weight: bold; color: #1e40af;">₹ ${Math.round(payment.totalPaidAmount || (payment.advanceAmount || 0) + (payment.remainingPaid || 0)).toLocaleString()}</td>
                        </tr>
                        ${
                          payment.balance > 0
                            ? `
                        <tr style="background-color: #fef2f2;">
                          <td style="font-weight: bold; color: #b91c1c;">BALANCE DUE (UNPAID)</td>
                          <td style="text-align: right; font-weight: 900; color: #b91c1c;">₹ ${Math.round(payment.balance).toLocaleString()}</td>
                        </tr>`
                            : ""
                        }
                        <tr class="total-row">
                          <td>TOTAL BILL AMOUNT</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.totalBillAmount || payment.amount || 0).toLocaleString()}</td>
                        </tr>
                      `
                          : data.registrationType === "IPD"
                            ? `
                        <tr>
                          <td style="font-weight: bold; color: #475569;">Initial Admission Fee</td>
                          <td style="text-align: right;">₹ ${Math.round(payment.totalBillAmount || payment.fee || payment.originalAmount || (Number(payment.amount || 0) + Number(payment.discount || appointment.discount || 0))).toLocaleString()}</td>
                        </tr>
                        ${
                          Number(payment.discount || appointment.discount || 0) > 0
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
                        ${
                          Number(payment.discount || appointment.discount || 0) > 0
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
        ${
          footerHtml ||
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
    (appointment && (appointment.appointmentHonorific || appointment.honorific || appointment.patientDetails?.honorific)) || patient.honorific || patient.profile?.honorific || patient.honorificTitle
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
                <title>Prescription - ${patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                        .container { min-height: 280mm !important; height: auto !important; border: none !important; }
                    }

                    html, body {
                      height: 100%;
                      margin: 0;
                      padding: 0;
                    }
                    body { 
                        font-family: 'Inter', sans-serif; 
                        margin: 0;
                        padding: 0;
                        background: white;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #111;
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
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
                        border: 1px solid #e5e7eb;
                    }

                    .footer-push {
                        margin-top: auto;
                    }

                    /* Header */
                    .header {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                    }
                    .brand { flex: 1; display: flex; align-items: center; gap: 15px; }
                    .brand-text { text-align: left; }
                    .brand h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                    .brand p { margin: 2px 0 0; font-size: 9px; color: #555; }
                    
                    .doctor { text-align: right; }
                    .doctor h2 { margin: 0; font-size: 14px; font-weight: 700; }
                    .doctor p { margin: 2px 0 0; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #555; }

                    /* Patient Grid - Clean, No Box */
                    .patient-info {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label { display: block; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #777; margin-bottom: 3px; letter-spacing: 0.5px; }
                    .info-val { font-size: 12px; font-weight: 600; text-transform: uppercase; }

                    /* Diagnosis */
                    .diagnosis-box { margin-bottom: 20px; }
                    .diagnosis-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
                    .diagnosis-val { font-size: 12px; font-weight: 600; margin-left: 6px; }

                    /* Med List/Table */
                    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #000; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; letter-spacing: 0.5px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #777; padding: 0 0 8px 0; border-bottom: 1px solid #eee; }
                    td { padding: 10px 0; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
                    
                    .med-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
                    .med-meta { font-size: 10px; color: #555; }
                    
                    /* Advice Grid */
                    .advice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .advice-list { list-style: none; padding: 0; margin: 0; }
                    .advice-list li { margin-bottom: 6px; padding-left: 15px; position: relative; font-size: 11px; }
                    .advice-list li:before { content: "•"; position: absolute; left: 0; color: #aaa; }

                    /* Follow up */
                    .follow-up { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #eee; font-size: 11px; }
                    .follow-up strong { font-weight: 700; text-transform: uppercase; font-size: 9px; color: #777; margin-right: 5px; }

                    /* Footer (Pushed to bottom) */
                    .footer { 
                        margin-top: auto;
                        padding-top: 30px;
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end; 
                    }
                    .footer-l span { display: block; font-size: 8px; color: #999; line-height: 1.5; }
                    
                    .sig-block { text-align: center; }
                    .sig-img { height: 40px; display: block; margin: 0 auto 5px; }
                    .sig-line { border-top: 1px solid #ccc; padding-top: 5px; font-size: 9px; font-weight: 600; text-transform: uppercase; min-width: 120px; }

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
                    ${
                      headerHtml ||
                      `
                    <div class="header">
                        <div class="brand">
                            ${hospital.logo ? `<img src="${hospital.logo}" style="max-height: 70px; width: auto; object-fit: contain;" />` : ""}
                            <div class="brand-text">
                                <h1>${hospital.name || "CureChain Medical Center"}</h1>
                                <p>${hospital.address || ""}</p>
                                <p>${hospital.contact || hospital.phone || ""} ${hospital.email ? `• ${hospital.email}` : ""}</p>
                            </div>
                        </div>
                    </div>
                    `
                    }

                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 10px;">
                        <div style="font-size: 16px; font-weight: 700; text-transform: uppercase; color: #1e40af;">PRESCRIPTION</div>
                        <div style="text-align: right;">
                            <h2 style="margin: 0; font-size: 14px; font-weight: 700;">${formatDoctorName(doctor.name)}</h2>
                            <p style="margin: 2px 0 0; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #555;">${doctor.specialization || "Consultant Physician"}</p>
                        </div>
                    </div>

                    <div class="patient-info">
                        <div>
                            <span class="info-label">Name</span>
                            <span class="info-val">${patientName}</span>
                        </div>
                        <div>
                            <span class="info-label">Age / Gender</span>
                            <span class="info-val">${ageDisplay} / ${genderDisplay}</span>
                        </div>
                        <div>
                            <span class="info-label">ID</span>
                            <span class="info-val">${patient.mrn || "-"}</span>
                        </div>
                        <div>
                            <span class="info-label">Date</span>
                            <span class="info-val">${new Date(prescription.createdAt).toLocaleDateString("en-GB")}</span>
                        </div>
                    </div>

                    ${
                      prescription.diagnosis
                        ? `
                    <div class="diagnosis-box">
                        <span class="diagnosis-label">Diagnosis:</span>
                        <span class="diagnosis-val">${prescription.diagnosis}</span>
                    </div>
                    `
                        : ""
                    }

                    <div class="section-label">Medications</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%">Medicine</th>
                                <th style="width: 20%">Dosage</th>
                                <th style="width: 20%">Frequency</th>
                                <th style="width: 10%">Days</th>
                                <th style="width: 10%">Qty</th>
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
                                <td class="med-meta">${med.dosage || "-"}</td>
                                <td class="med-meta">${med.freq || med.frequency || "-"}</td>
                                <td class="med-meta">${med.duration || "-"}</td>
                                <td class="med-meta">${med.quantity || "-"}</td>
                            </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>

                    <div class="advice-grid">
                        ${
                          dietAdvice.length > 0
                            ? `
                        <div>
                            <div class="section-label" style="border-bottom: 1px solid #eee; margin-top: 10px;">Advice</div>
                            <ul class="advice-list">
                                ${dietAdvice
                                  .filter((i: string) => i.trim())
                                  .map((d: string) => `<li>${d}</li>`)
                                  .join("")}
                            </ul>
                        </div>
                        `
                            : ""
                        }
                    </div>

                    ${
                      prescription.advice
                        ? `
                    <div class="follow-up">
                        <strong>Advice / Follow Up:</strong> ${prescription.advice}
                    </div>
                    `
                        : ""
                    }

                    <div class="footer-push">
                    ${
                      footerHtml ||
                      `
                    <div class="footer">
                        <div class="footer-l">
                            <span>Generated by MsCurechain Systems</span>
                            <span>Valid for 30 days</span>
                        </div>
                        <div class="sig-block">
                            ${doctor.signature ? `<img src="${doctor.signature}" class="sig-img" />` : '<div style="height: 40px;"></div>'}
                            <div class="sig-line">Authorized Signature</div>
                        </div>
                    </div>
                    `
                    }
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
                body { margin: 0; padding: 12mm 15mm 12mm 25mm; }
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
              ${
                headerHtml ||
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

              ${
                notes
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

                ${
                  footerHtml ||
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
  const { hospital, patient, doctor, labSample, headerHtml, footerHtml } = data;
  const formattedPatientName = formatPatientNameWithPrefix(
    patient?.name || patient?.user?.name,
    patient?.honorific || patient?.profile?.honorific || patient?.honorificTitle
  );
  const ageDisplay = computeAgeFromDob(patient?.dob, patient?.age, patient?.ageUnit);
  const tests = labSample?.tests || [];
  const sampleId = labSample?.sampleId || 'N/A';
  const sampleType = labSample?.sampleType || 'N/A';
  const reportDate = labSample?.reportDate ? new Date(labSample.reportDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const collectionDate = labSample?.collectionDate ? new Date(labSample.collectionDate).toLocaleDateString('en-GB') : 'N/A';
  const status = labSample?.status || 'Completed';

  const getDisplayRange = (test: any) => {
    if (test.range) return test.range;
    if (test.referenceRange) return test.referenceRange;
    if (!test.normalRanges) return test.normalRange || '-';
    const gender = (patient?.gender || '').toLowerCase();
    const age = patient?.age || 0;
    let range;
    if (age < 12) range = test.normalRanges.child;
    else if (gender === 'male') range = test.normalRanges.male;
    else if (gender === 'female') range = test.normalRanges.female;
    if (range && (range.min !== undefined || range.max !== undefined)) {
      return `${range.min ?? 0} - ${range.max ?? 0}`;
    }
    return test.normalRange || '-';
  };

  const formatQualitativeRange = (range: string, result: string, name?: string) => {
    const resLower = String(result || '').trim().toLowerCase();
    const rangeLower = String(range || '').trim().toLowerCase();
    const nameLower = String(name || '').trim().toLowerCase();
    
    if (rangeLower === '0 - 0' || rangeLower === '0-0' || rangeLower === 'n/a' || rangeLower === '0' || rangeLower === '-' || rangeLower.includes('reactive, non reactive') || rangeLower.includes('reactive / non reactive')) {
      if (resLower.includes('reactive')) return 'Non-Reactive';
      if (resLower.includes('negative') || resLower.includes('positive') || nameLower.includes('hcv') || nameLower.includes('hiv') || nameLower.includes('hbsag') || nameLower.includes('dengue') || nameLower.includes('tpha')) return 'Negative';
      if (rangeLower.includes('reactive')) return 'Non-Reactive';
    }
    return range;
  };

  const formatQualitativeUnit = (unit: string, result: string) => {
    const uLower = String(unit || '').trim().toLowerCase();
    const resLower = String(result || '').trim().toLowerCase();
    if (uLower === 'n/a' || uLower === 'none' || uLower === '0' || uLower === '-' || resLower.includes('negative') || resLower.includes('positive') || resLower.includes('reactive')) {
      return '';
    }
    return unit === '-' ? '' : unit;
  };

  const checkIsAbnormalRange = (valStr: any, rangeStr: any, currentAbnormal?: boolean) => {
    if (currentAbnormal) return true;
    if (!valStr || !rangeStr || rangeStr === '-' || rangeStr === 'N/A') return false;
    if (String(valStr).includes('(L)') || String(valStr).includes('(H)')) return true;
    const cleanVal = parseFloat(String(valStr).replace(/,/g, '').trim());
    if (isNaN(cleanVal)) return false;
    const cleanRange = String(rangeStr).replace(/,/g, '').trim();
    const rangeMatch = cleanRange.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(-?\d+(?:\.\d+)?)$/i);
    if (rangeMatch) {
      const minVal = parseFloat(rangeMatch[1]);
      const maxVal = parseFloat(rangeMatch[2]);
      if (!isNaN(minVal) && cleanVal < minVal) return true;
      if (!isNaN(maxVal) && cleanVal > maxVal) return true;
    } else if (cleanRange.startsWith('<')) {
      const maxVal = parseFloat(cleanRange.substring(1).trim());
      if (!isNaN(maxVal) && cleanVal >= maxVal) return true;
    } else if (cleanRange.startsWith('>')) {
      const minVal = parseFloat(cleanRange.substring(1).trim());
      if (!isNaN(minVal) && cleanVal <= minVal) return true;
    }
    return false;
  };

  const testsHtml = tests.map((test: any, idx: number) => {
    const rawUnit = test.unit || '-';
    const rawRange = getDisplayRange(test);
    const resultValue = test.resultValue || '-';
    const range = formatQualitativeRange(rawRange, resultValue, test.testName);
    const unit = formatQualitativeUnit(rawUnit, resultValue);
    const isAbnormal = checkIsAbnormalRange(resultValue, range, test.isAbnormal || String(resultValue).includes('(L)') || String(resultValue).includes('(H)'));
    const hasSubTests = test.subTests && test.subTests.length > 0;
    const isMajorPanel = (t: any) => t && t.subTests && t.subTests.length >= 6;
    const isDeptSwitch = idx > 0 && test.departmentName && test.departmentName !== tests[idx - 1]?.departmentName;
    const shouldBreakPage = idx > 0 && (isMajorPanel(test) || isMajorPanel(tests[idx - 1]) || isDeptSwitch);
    const breakStyle = shouldBreakPage ? 'page-break-before: always; break-before: page;' : '';

    const subTestsHtml = (test.subTests || []).map((sub: any) => {
      const rawSubRange = getDisplayRange(sub);
      const inheritedRange = (rawSubRange && rawSubRange !== '-') ? rawSubRange : rawRange;
      const subRange = formatQualitativeRange(inheritedRange, sub.result || '-', sub.name || test.testName);
      const inheritedUnit = (sub.unit && sub.unit !== '-') ? sub.unit : rawUnit;
      const subUnit = formatQualitativeUnit(inheritedUnit, sub.result || '-');
      const subAbnormal = checkIsAbnormalRange(sub.result, subRange, sub.isAbnormal || String(sub.result || '').includes('(L)') || String(sub.result || '').includes('(H)') || isAbnormal);
      return `
      <tr style="background: #ffffff; page-break-inside: avoid; break-inside: avoid;">
        <td style="padding: 5px 8px 5px 20px; border-bottom: none; font-size: 12px; color: #334155; text-transform: uppercase;">${sub.name || '-'}</td>
        <td style="padding: 5px 8px; border-bottom: none; font-size: 12px; font-weight: ${subAbnormal ? '900' : '600'}; color: ${subAbnormal ? '#dc2626' : '#1e293b'};">
          ${sub.result || '-'}
          ${subAbnormal ? '<span style="font-size:10px; background:#fee2e2; color:#dc2626; padding: 1px 5px; border-radius:4px; margin-left:6px; font-weight:900;">▲ HIGH/LOW</span>' : ''}
        </td>
        <td style="padding: 5px 8px; border-bottom: none; font-size: 12px; color: #64748b;">${subUnit}</td>
        <td style="padding: 5px 8px; border-bottom: none; font-size: 12px; color: #475569;">${subRange}</td>
      </tr>`;
    }).join('');

    if (hasSubTests) {
      return `
        <tr style="background: #f8fafc; page-break-inside: avoid; break-inside: avoid; ${breakStyle}">
          <td colspan="4" style="padding: 8px 8px; border-top: ${idx > 0 && !shouldBreakPage ? '2px solid #cbd5e1' : 'none'}; border-bottom: none; font-weight: 800; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${test.testName || '-'}</td>
        </tr>
        ${subTestsHtml}
      `;
    }

    return `
      <tr style="background: #ffffff; page-break-inside: avoid; break-inside: avoid; ${breakStyle}">
        <td style="padding: 6px 8px; border-top: ${idx > 0 && !shouldBreakPage ? '1px solid #e2e8f0' : 'none'}; border-bottom: none; font-weight: 700; font-size: 12px; color: #1e293b; text-transform: uppercase;">${test.testName || '-'}</td>
        <td style="padding: 6px 8px; border-top: ${idx > 0 && !shouldBreakPage ? '1px solid #e2e8f0' : 'none'}; border-bottom: none; font-weight: ${isAbnormal ? '900' : '700'}; font-size: 12px; color: ${isAbnormal ? '#dc2626' : '#1e293b'};">
          ${resultValue}
          ${isAbnormal ? '<span style="font-size:10px; background:#fee2e2; color:#dc2626; padding: 1px 5px; border-radius:4px; margin-left:6px; font-weight:900;">▲ HIGH/LOW</span>' : ''}
        </td>
        <td style="padding: 6px 8px; border-top: ${idx > 0 && !shouldBreakPage ? '1px solid #e2e8f0' : 'none'}; border-bottom: none; font-size: 12px; color: #64748b;">${unit}</td>
        <td style="padding: 6px 8px; border-top: ${idx > 0 && !shouldBreakPage ? '1px solid #e2e8f0' : 'none'}; border-bottom: none; font-size: 12px; color: #475569;">${range}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lab Report - ${formattedPatientName || 'Patient'}</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          @page { size: A4; margin: 8mm; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          table.lab-master-print-table { width: 100% !important; border-collapse: collapse !important; border: none !important; }
          table.lab-master-print-table > thead { display: table-header-group !important; }
          table.lab-master-print-table > tbody { display: table-row-group !important; }
          table.lab-master-print-table > tfoot { display: table-footer-group !important; }
          table.lab-master-print-table > thead > tr > td, table.lab-master-print-table > tbody > tr > td, table.lab-master-print-table > tfoot > tr > td { border: none !important; padding: 0 !important; }
        }
        html, body { height: 100%; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', Arial, sans-serif;
          background: white;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.5;
        }
        .container {
          width: 210mm;
          min-height: 296mm;
          margin: 0 auto;
          padding: 12mm 16mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .footer-push {
          margin-top: auto;
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
          display: block;
          text-align: center;
          margin: 12px auto;
        }
        .report-title {
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #1e3a5f;
          border-bottom: 3px double #1e3a5f;
          padding-bottom: 10px;
          margin: 18px 0 16px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 18px;
        }
        .info-row { display: flex; gap: 6px; font-size: 11px; }
        .info-label { font-weight: 700; color: #64748b; white-space: nowrap; min-width: 90px; }
        .info-value { font-weight: 600; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        thead tr {
          background: #1e3a5f;
          color: white;
        }
        thead th {
          padding: 10px 10px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: left;
        }
        .footer-section {
          margin-top: 40px;
          border-top: 2px solid #e2e8f0;
          padding-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          text-align: center;
        }
        .sig-block { }
        .sig-line {
          border-bottom: 1.5px solid #000;
          margin: 0 auto 6px;
          width: 140px;
        }
        .sig-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
        .sig-sublabel { font-size: 9px; color: #94a3b8; margin-top: 2px; font-style: italic; }
        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
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
          setTimeout(() => { window.location.replace('${data.returnUrl || "/helpdesk"}'); }, 500);
        };
      </script>
      <div class="no-print">
        <button onclick="window.location.replace('${data.returnUrl || "/helpdesk"}')" class="return-btn">
          ← BACK TO HOSPITAL DASHBOARD
        </button>
      </div>
      <div class="container">
        <table class="lab-master-print-table" style="width: 100%; border-collapse: collapse; border: none;">
          <thead>
            <tr>
              <td colspan="4" style="border: none; padding: 0;">
                ${headerHtml || `
                <div style="text-align:center; padding-bottom: 10px; border-bottom: 2px solid #1e3a5f; margin-bottom: 12px;">
                  <h1 style="margin:0; font-size:22px; font-weight:900; text-transform:uppercase; color:#1e3a5f;">
                    ${hospital?.name || 'Medical Center'}
                  </h1>
                  <p style="margin:4px 0 0; font-size:11px; color:#64748b;">${hospital?.address || ''}</p>
                  ${hospital?.phone ? `<p style="margin:2px 0 0; font-size:10px; color:#94a3b8;">Phone: ${hospital.phone}</p>` : ''}
                </div>`}

                <div class="report-title">Laboratory Report</div>

                <div class="info-grid">
                  <div class="info-row"><span class="info-label">Patient Name</span><span class="info-value">: ${formattedPatientName || 'N/A'}</span></div>
                  <div class="info-row"><span class="info-label">Sample ID</span><span class="info-value">: ${sampleId}</span></div>
                  <div class="info-row"><span class="info-label">Age / Gender</span><span class="info-value">: ${ageDisplay || 'N/A'} / ${patient?.gender || 'N/A'}</span></div>
                  <div class="info-row"><span class="info-label">MRN</span><span class="info-value">: ${patient?.mrn || 'N/A'}</span></div>
                  <div class="info-row"><span class="info-label">Referred By</span><span class="info-value">: ${doctor?.name ? (doctor.name.toLowerCase().startsWith('dr') ? doctor.name : `Dr. ${doctor.name}`) : 'N/A'}</span></div>
                  <div class="info-row"><span class="info-label">Sample Type</span><span class="info-value">: ${sampleType}</span></div>
                  <div class="info-row"><span class="info-label">Collection Date</span><span class="info-value">: ${collectionDate}</span></div>
                  <div class="info-row"><span class="info-label">Report Date</span><span class="info-value">: ${reportDate}</span></div>
                  <div class="info-row"><span class="info-label">Status</span><span class="info-value">: <span class="status-badge">${status}</span></span></div>
                  <div class="info-row"><span class="info-label">Mobile</span><span class="info-value">: ${patient?.mobile || 'N/A'}</span></div>
                </div>
              </td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
              <th style="width:40%; padding: 8px 10px; text-align: left; font-size: 12px; color: #334155;">Parameter</th>
              <th style="width:20%; padding: 8px 10px; text-align: left; font-size: 12px; color: #334155;">Result</th>
              <th style="width:15%; padding: 8px 10px; text-align: left; font-size: 12px; color: #334155;">Units</th>
              <th style="width:25%; padding: 8px 10px; text-align: left; font-size: 12px; color: #334155;">Reference Range</th>
            </tr>
          </thead>
          <tbody>
            ${tests.length > 0 ? testsHtml : `
              <tr>
                <td colspan="4" style="text-align:center; padding: 30px; color:#94a3b8; font-style:italic;">
                  No test results available yet
                </td>
              </tr>
            `}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="border: none; padding: 0;">
                <div class="footer-push">
                ${footerHtml || `
                <div style="border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 8px; text-align:center; font-size:9px; color:#9ca3af;">
                  <p style="margin:0;">Generated by MsCureChain • ${new Date().toLocaleDateString('en-GB')} at ${formatTime12Hr(new Date())}</p>
                </div>`}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
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
      ${
        headerHtml ||
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
        ${
          footerHtml ||
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

  const billDateObj = payment?.date ? new Date(payment.date) : new Date();
  const billDateFormatted = !isNaN(billDateObj.getTime())
    ? billDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("en-GB");
  const billTimeFormatted = !isNaN(billDateObj.getTime())
    ? billDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

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
                            <div style="font-size: 9.5px; font-weight: 700; color: #1e293b;">${patient.mrn || "N/A"} / ${patient.mobile || "N/A"}</div>
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
