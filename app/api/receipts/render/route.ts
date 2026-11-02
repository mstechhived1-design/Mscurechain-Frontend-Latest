import { NextRequest, NextResponse } from "next/server";
import {
  generateClinicalReceiptHtml,
  generateOPDRegistrationSlipHtml,
  generatePrescriptionHtml,
  generateLabTokenHtml,
  generateLabReceiptHtml,
  generateLabReportHtml,
  generateAddBillsReceiptHtml,
  parseSafeDate,
} from "@/lib/print-utils";
import { generateDischargeSummaryHTML } from "@/lib/utils/print-discharge-summary";
import { generateTransactionReportHTML } from "@/lib/utils/print-transaction-report";

function buildReceiptHeaderHtml(hospital: any): string {
  const name = hospital.name || "";
  const address = hospital.address || "";
  const phone = hospital.phone || hospital.contact || "";
  const email = hospital.email || "";
  const logo = hospital.logo || "";

  return `
  <div style="position: relative; width: 100%;" class="main-header-print-container">
    <div style="width: 100%; background-color: #ffffff; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-bottom: 12px; print-color-adjust: exact; -webkit-print-color-adjust: exact; padding: 0; box-sizing: border-box;">
      <div style="display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 20px; padding: 8px 0; width: 100%; box-sizing: border-box;">
        <div style="flex: 0 0 auto; padding-right: 15px;">
          ${logo ? `<img src="${logo}" alt="Hospital Logo" style="width: 100px; height: 100px; object-fit: contain;" />` : `
          <div style="width: 90px; height: 90px; border: 1.5px solid #1e3a8a; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-size: 10px; font-weight: bold; text-transform: uppercase;">LOGO</div>`}
        </div>
        <div style="width: 2px; height: 70px; background-color: #1e3a8a; opacity: 0.1; display: block;"></div>
        <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding-left: 5px;">
          ${name ? `<h1 style="margin: 0; font-weight: 900; color: #1e3a8a; line-height: 1.1; font-size: 24px; text-transform: uppercase; letter-spacing: -0.5px;">${name}</h1>` : ''}
          ${email ? `
          <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #0284c7; font-weight: 700; margin-top: 2px;">
            <div style="width: 14px; height: 14px; background-color: #1e3a8a; border-radius: 2px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <span>${email}</span>
          </div>` : ''}
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px; width: 100%;">
            ${address ? `<span style="color: #64748b;">${address}</span>` : ''}
            ${phone ? `
            <div style="display: flex; align-items: center; gap: 6px; margin-left: ${address ? '8px' : '0'};">
              <div style="width: 16px; height: 16px; background-color: #22c55e; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <span style="color: #16a34a; font-weight: 800;">${phone}</span>
            </div>` : ''}
          </div>
        </div>
      </div>
      <div style="width: 100%; height: 4px; background-color: #10b981; margin-top: 10px; border-radius: 2px;"></div>
    </div>
  </div>`;
}

function buildReceiptFooterHtml(hospital: any): string {
  const name = hospital.name || "";
  const address = hospital.address || "";
  const phone = hospital.phone || hospital.contact || "";
  const email = hospital.email || "";

  return `
  <div style="width: 100%; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; margin-top: 20px;">
    <div style="width: 100%; height: 3px; background-color: #10b981; border-radius: 2px; margin-bottom: 6px;"></div>
    <div style="display: flex; flex-wrap: wrap; align-items: stretch; gap: 6px; margin-bottom: 6px;">
      ${phone ? `
      <div style="flex: 1; background: #22c55e; color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 12px; letter-spacing: 0.5px; gap: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${phone}
      </div>` : ''}
      ${email ? `
      <div style="flex: 2; background: #1e3a8a; color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 11px; gap: 6px;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        ${email}
      </div>` : ''}
    </div>
    ${address ? `
    <div style="text-align: center; font-size: 9px; color: #64748b; font-weight: 500; line-height: 1.4; padding-bottom: 4px;">
      ${name ? `<span style="font-weight: 700; color: #1e3a8a;">${name} &mdash; </span>` : ''}${address}
    </div>` : ''}
  </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body || {};

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: "Both 'type' and 'data' payload are required" },
        { status: 400 }
      );
    }

    let html = "";
    let title = "Hospital Document";
    let documentName = `${type}_${data._id || Date.now()}.pdf`;
    let caption = "Official Hospital Record";

    // Extract genuine entities without any fake dummy Kadapa fallbacks
    const hospital =
      (typeof data.hospital === "object" && data.hospital !== null && !Array.isArray(data.hospital) ? data.hospital : null) ||
      (typeof data.appointment?.hospital === "object" && data.appointment?.hospital !== null && !Array.isArray(data.appointment?.hospital) ? data.appointment.hospital : null) ||
      {};
    const patientDetails =
      (typeof data.patientDetails === "object" && data.patientDetails !== null && !Array.isArray(data.patientDetails) ? data.patientDetails : null) ||
      (typeof data.appointment?.patientDetails === "object" && data.appointment?.patientDetails !== null && !Array.isArray(data.appointment?.patientDetails) ? data.appointment.patientDetails : null) ||
      {};
    const patient =
      (typeof data.patient === "object" && data.patient !== null && !Array.isArray(data.patient) ? data.patient : null) ||
      (typeof data.appointment?.patient === "object" && data.appointment?.patient !== null && !Array.isArray(data.appointment?.patient) ? data.appointment.patient : null) ||
      patientDetails ||
      {};
    const doctor =
      (typeof data.doctor === "object" && data.doctor !== null && !Array.isArray(data.doctor) ? data.doctor : null) ||
      (typeof data.appointment?.doctor === "object" && data.appointment?.doctor !== null && !Array.isArray(data.appointment?.doctor) ? data.appointment.doctor : null) ||
      {};

    const honorific =
      data.honorific ||
      data.appointmentHonorific ||
      patient.honorific ||
      patient.profile?.honorific ||
      patientDetails.honorific ||
      data.patientDetails?.honorific ||
      "";

    let rawPatientName =
      patientDetails.name ||
      patient.name ||
      patient.fullName ||
      patient.user?.name ||
      data.patientName ||
      data.customerName ||
      "";

    if (rawPatientName.toUpperCase().includes("UNNAMED") || rawPatientName.toUpperCase().includes("UNKNOWN")) {
      rawPatientName = patientDetails.name || patient.name || data.patientName || data.customerName || "";
      if (rawPatientName.toUpperCase().includes("UNNAMED") || rawPatientName.toUpperCase().includes("UNKNOWN")) {
        rawPatientName = "";
      }
    }

    let patientName = rawPatientName.trim();
    if (honorific && patientName && !patientName.toLowerCase().startsWith(honorific.toLowerCase())) {
      const cleanPrefix = honorific.trim();
      patientName = `${cleanPrefix} ${patientName}`;
    }

    const patientMRN =
      patient.mrn ||
      patient.profile?.mrn ||
      patient.medicalRecordNumber ||
      patient.uhid ||
      data.mrn ||
      data.patientMRN ||
      data.appointment?.mrn ||
      "";

    const patientMobile =
      patient.mobile ||
      patient.phone ||
      patient.contactNumber ||
      patient.user?.mobile ||
      patientDetails.guardianMobile ||
      data.customerPhone ||
      data.mobile ||
      data.phone ||
      "";

    const patientAddress =
      patient.address ||
      patient.profile?.address ||
      patient.user?.address ||
      data.patientAddress ||
      data.address ||
      "";

    const patientDob =
      patient.dateOfBirth ||
      patient.dob ||
      patient.profile?.dob ||
      patient.user?.dateOfBirth ||
      data.dob ||
      data.dateOfBirth ||
      "";

    const patientGender =
      patient.gender ||
      patient.profile?.gender ||
      patientDetails.gender ||
      data.gender ||
      "";

    const patientAge =
      patient.age ||
      patient.profile?.age ||
      patientDetails.age ||
      data.age ||
      "";

    const doctorName =
      doctor.name ||
      doctor.user?.name ||
      data.doctorName ||
      "";

    // ── 1. PRESCRIPTION ──
    if (type === "prescription") {
      const prescObj = {
        ...(typeof data.prescription === "object" && data.prescription !== null ? data.prescription : {}),
        ...data,
        medicines: data.medicines || (data.prescription && data.prescription.medicines) || [],
        diagnosis: data.diagnosis || (data.prescription && data.prescription.diagnosis) || data.provisionalDiagnosis || data.symptoms || data.reason || "",
      };
      html = generatePrescriptionHtml({
        hospital,
        patient: {
          ...patient,
          name: patientName,
          honorific,
          mrn: patientMRN,
          mobile: patientMobile,
          address: patientAddress,
          dob: patientDob,
          gender: patientGender,
          age: patientAge,
        },
        doctor: {
          ...doctor,
          name: doctorName,
        },
        prescription: prescObj,
        appointment: data.appointment || prescObj.appointment || data,
        headerHtml: buildReceiptHeaderHtml(hospital),
        footerHtml: buildReceiptFooterHtml(hospital),
      });

      title = `Prescription - ${patientName || "Patient"}`;
      documentName = `Prescription_${data._id || patientMRN || "record"}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*DOCTOR PRESCRIPTION*\n\n*Patient:* ${patientName}\n*Doctor:* ${doctorName}\n*Date:* ${data.prescriptionDate || prescObj.prescriptionDate || ""}\n━━━━━━━━━━━━━━━━━━\n• Official signed prescription attached.`;
    }

    // ── 2. APPOINTMENT / CONSULTATION RECEIPT (Exact match with helpdesk OLD RECEIPT) ──
    else if (type === "appointment" || type === "consultation") {
      const apptObj = data.appointment || data;
      const rawAmt = data.amount ?? apptObj.amount ?? apptObj.consultationFee ?? apptObj.fee ?? 0;
      const cleanAmt = typeof rawAmt === 'number' && !isNaN(rawAmt)
        ? rawAmt
        : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;

      const rawMode = data.paymentMethod || apptObj.paymentMethod || "UPI";
      const cleanMode = /razorpay|online/i.test(rawMode) ? "UPI" : rawMode;

      const payment = data.payment || apptObj.payment || {
        amount: cleanAmt,
        status: data.paymentStatus || apptObj.paymentStatus || "PAID",
        mode: cleanMode,
        method: cleanMode,
      };

      const tokenNo =
        data.token_number ||
        data.tokenNo ||
        data.tokenNumber ||
        apptObj.token_number ||
        apptObj.tokenNo ||
        apptObj.tokenNumber ||
        "";

      const symptoms =
        data.symptoms ||
        apptObj.symptoms ||
        data.reason ||
        apptObj.reason ||
        data.chiefComplaint ||
        apptObj.chiefComplaint ||
        "";

      const headerHtml = buildReceiptHeaderHtml(hospital);
      const footerHtml = buildReceiptFooterHtml(hospital);

      html = generateOPDRegistrationSlipHtml({
        hospital: {
          ...hospital,
          name: hospital.name || "",
          address: hospital.address || "",
          contact: hospital.contact || hospital.phone || "",
          phone: hospital.phone || hospital.contact || "",
          email: hospital.email || "",
          opdFollowUpDays: hospital.opdFollowUpDays ?? 7,
          enableFollowUpExpiry: hospital.enableFollowUpExpiry ?? true,
        },
        patient: {
          ...patient,
          name: patientName,
          mrn: patientMRN,
          mobile: patientMobile,
          address: patientAddress,
          dob: patientDob,
          gender: patientGender,
          age: patientAge,
        },
        doctor: {
          ...doctor,
          name: doctorName,
        },
        appointment: {
          ...apptObj,
          doctorName: doctorName,
          token_number: tokenNo,
          tokenNo: tokenNo,
          tokenNumber: tokenNo,
          symptoms: symptoms,
          type: apptObj.type || "offline",
          visitType: "OPD",
          followUpStatus: apptObj.followUpStatus || { doctorVisitCount: 1 },
          appointmentId: data.appointmentId || apptObj.appointmentId || data._id || "",
          date: apptObj.date || data.date || "",
          appointmentTime: apptObj.appointmentTime || apptObj.startTime || apptObj.time || "",
        },
        payment: {
          ...payment,
          amount: payment.amount ?? 0,
          mode: payment.mode || payment.paymentMethod || "UPI",
          method: payment.mode || payment.paymentMethod || "UPI",
          status: payment.status || payment.paymentStatus || "PAID",
        },
        registrationType: "OPD",
        headerHtml,
        footerHtml,
        printWithHeader: true,
        showGuardianDetails: false,
      });

      title = `Appointment Receipt - ${patientName || "Patient"}`;
      documentName = `AppointmentReceipt_${data.appointmentId || data._id || "receipt"}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*OPD CONSULTATION RECEIPT*\n\n*Patient:* ${patientName}\n*Doctor:* ${doctorName}\n*Token No:* #${tokenNo}\n*Amount:* ₹${payment.amount} (${String(payment.status).toUpperCase()})\n━━━━━━━━━━━━━━━━━━\n• Show this receipt at hospital frontdesk.`;
    }

    // ── 3. LAB TOKEN ──
    else if (type === "lab-token") {
      html = generateLabTokenHtml({
        hospital,
        patient: {
          ...patient,
          name: patientName,
          mrn: patientMRN,
        },
        doctor: {
          ...doctor,
          name: doctorName,
        },
        appointment: data.appointment || data,
        tests: data.tests || data.testNames || [],
        token: data.tokenNumber || data.tokenNo || data._id,
        sampleId: data.sampleId || data._id,
      });

      title = `Lab Token - ${patientName || "Patient"}`;
      documentName = `LabToken_${data._id || "token"}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*LAB PHLEBOTOMY TOKEN*\n\n*Patient:* ${patientName}\n*Token No:* #${data.tokenNumber || ""}\n━━━━━━━━━━━━━━━━━━\n• Sample collection counter slip.`;
    }

    // ── 4. LAB INVOICE (Exact match with BillPrintView.tsx from Screenshot 3) ──
    else if (type === "lab-invoice" || type === "lab-bill") {
      const payment = data.payment || {
        amount: data.amount || data.totalAmount || 0,
        status: data.paymentStatus || "PAID",
        mode: data.paymentMethod || "CASH",
      };

      // Extract tests
      let testItems: any[] = [];
      if (Array.isArray(data.items) && data.items.length > 0) {
        testItems = data.items;
      } else if (Array.isArray(data.tests) && data.tests.length > 0) {
        testItems = data.tests;
      } else if (data.testName || data.name) {
        testItems = [{ testName: data.testName || data.name, price: payment.amount || 0 }];
      }

      const totalAmount = Number(
        data.totalAmount ??
        data.amount ??
        payment.amount ??
        testItems.reduce((acc, t) => acc + (Number(t.price) || 0), 0)
      );

      const discountAmount = Number(data.discount || payment.discount || 0);
      const paidAmount = Number(data.paidAmount ?? payment.amount ?? totalAmount);
      const balanceAmount = Number(data.balance ?? (totalAmount - discountAmount - paidAmount > 0 ? totalAmount - discountAmount - paidAmount : 0));
      const paymentMode = data.paymentMode || payment.mode || data.paymentMethod || "Cash";
      const invoiceId = data.invoiceId || data.invoiceNo || (data.tokenNumber ? `OPD-${data.tokenNumber}` : `OPD-HHO${(data._id || "").slice(-6).toUpperCase()}`);

      const rawDate = data.date || data.createdAt || data.billDate || new Date();
      const safeDate = parseSafeDate(rawDate) || new Date();
      const currentDate = safeDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const currentTime = safeDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      const patAge = patient.age || data.patientDetails?.age || "-";
      const patAgeUnit = patient.ageUnit || data.patientDetails?.ageUnit || "Years";
      const patGender = patient.gender || data.patientDetails?.gender || "-";
      const ageGenderStr = `${patAge !== "-" ? `${patAge} ${patAgeUnit}` : "-"} / ${patGender}`;
      const patMobile = patient.mobile || data.patientDetails?.mobile || data.patientDetails?.phone || "-";
      const patMRN = patient.mrn || data.patientDetails?.mrn || data.mrn || "N/A";
      const patName = patientName || patient.name || data.patientDetails?.name || "Patient";
      const docName = doctorName || doctor.name || data.doctor?.name || data.refDoctor || "";

      const labName = data.labInfo?.name || (hospital.name ? (hospital.name.toUpperCase().includes("LAB") ? hospital.name.toUpperCase() : `${hospital.name.toUpperCase()} LABORATORY`) : "LABORATORY");
      const labAddress = data.labInfo?.address || hospital.address || "";
      const labPhone = data.labInfo?.phone || hospital.phone || hospital.contact || "";
      const labEmail = data.labInfo?.email || hospital.email || "";
      const labLogo = data.labInfo?.logo || hospital.logo || "";

      const testRows = testItems.length > 0
        ? testItems.map((item, idx) => {
            const tName = item.testName || item.name || item.test?.testName || "Diagnostic Test";
            const price = Number(item.price ?? item.cost ?? (testItems.length === 1 ? totalAmount : 0));
            return `
            <tr>
              <td style="border: 1px solid #000000; padding: 6px 10px; text-align: left; width: 60px;">${idx + 1}</td>
              <td style="border: 1px solid #000000; padding: 6px 10px; text-align: left; font-weight: 500;">${tName}</td>
              <td style="border: 1px solid #000000; padding: 6px 10px; text-align: right; width: 120px; font-weight: 700;">₹${price.toFixed(2)}</td>
            </tr>`;
          }).join("")
        : `<tr><td colspan="3" style="border: 1px solid #000000; padding: 12px; text-align: center;">No tests recorded on this invoice</td></tr>`;

      html = `<!DOCTYPE html>
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
      height: 100%;
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
      min-height: 100vh;
    }
    table { border-collapse: collapse; }
    th, td { box-sizing: border-box; }
  </style>
</head>
<body>
  <div class="bill-wrapper">
    <div>
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
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #1e3a8a; font-weight: 700; margin-top: 2px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>${labEmail}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; flex-wrap: wrap;">
              <span>${labAddress}</span>
              <span style="color: #cbd5e1;">|</span>
              <div style="display: flex; align-items: center; gap: 5px; color: #15803d; font-weight: 700;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#15803d" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>${labPhone}</span>
              </div>
            </div>
          </div>
        </div>
        <div style="width: 100%; height: 4px; background-color: #15803d; border-radius: 2px;"></div>
      </div>

      <!-- Center Title: OPD INVOICE matching Screenshot 3 -->
      <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 12px; position: relative; width: 100%;">
        <div style="width: 100%; border-top: 1px solid #000000; position: absolute; top: 11px; left: 0; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; background-color: #ffffff; padding: 0 16px; font-weight: 800; font-size: 14px; text-transform: uppercase; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 2px;">
          OPD INVOICE
        </span>
      </div>

      <!-- Info Grid Box (Border 1px solid #000) matching Screenshot 3 -->
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
                <td style="color: #000000; font-weight: 700;">${patName}</td>
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

      <!-- Summary / Totals Section (2 Columns matching hospital portal exactly) -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 14px;">
        <tr>
          <!-- Left: Payment Summary (4 rows matching hospital portal) -->
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
                <td style="padding: 6px 10px; font-weight: 700; color: #000000;">Bill Time:</td>
                <td style="padding: 6px 10px; text-align: right; color: #000000; font-weight: 600;">${currentTime}</td>
              </tr>
            </table>
          </td>

          <!-- Right: Totals Box (2 rows matching hospital portal) -->
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Total Amount:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; border-bottom: 1px solid #000000;">₹${totalAmount.toFixed(2)}</td>
              </tr>
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
    <div style="margin-top: auto; padding-top: 10px; page-break-inside: avoid;">
      <!-- Green & Blue Contact Banner Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed;">
        <tr>
          <!-- Green Phone Side (50%) -->
          <td style="width: 50%; background-color: #15803d; color: #ffffff; padding: 6px 14px; font-size: 11px; font-weight: 700; vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>${labPhone}</span>
            </div>
          </td>
          <!-- Blue Email Side (50%) -->
          <td style="width: 50%; background-color: #1e3a8a; color: #ffffff; padding: 6px 14px; font-size: 11px; font-weight: 700; vertical-align: middle; text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>${labEmail}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Bottom Disclaimers & Address matching Screenshot 3 -->
      <table style="width: 100%; border-collapse: collapse; font-size: 8px; color: #1e3a8a; line-height: 1.3;">
        <tr>
          <td style="vertical-align: top; width: 60%; color: #0284c7; font-weight: 500;">
            <div>• Results clinically correlation recommended</div>
            <div>• Contact lab immediately for alarming results</div>
            <div>• Not for medico-legal purpose</div>
            <div>• (*) Tests are not NABL accredited</div>
          </td>
          <td style="vertical-align: top; width: 40%; text-align: right; color: #475569; font-weight: 500;">
            ${labAddress}
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;

      title = `Lab Invoice - ${patName || "Patient"}`;
      documentName = `LabInvoice_${invoiceId}.pdf`;
      caption = `*${labName}*\n━━━━━━━━━━━━━━━━━━\n*OPD LAB INVOICE*\n\n*Patient:* ${patName}\n*Invoice #:* ${invoiceId}\n*Amount:* ₹${totalAmount}\n━━━━━━━━━━━━━━━━━━\n• Diagnostic lab invoice attached.`;
    }

    // ── 5. LAB INVESTIGATION REPORT ──
    else if (type === "lab-report") {
      const rawTests =
        data.tests ||
        (data.labSample && data.labSample.tests) ||
        (data.report && data.report.tests) ||
        data.results ||
        [];

      const labSampleObj = {
        sampleId:
          data.sampleId ||
          data.tokenNumber ||
          data.tokenNo ||
          (data.labSample && data.labSample.sampleId) ||
          `SMP-${(data._id || "").slice(-6).toUpperCase()}`,
        sampleType:
          data.sampleType ||
          data.specimen ||
          (data.labSample && data.labSample.sampleType) ||
          "Blood",
        reportDate:
          data.reportDate ||
          (data.labSample && data.labSample.reportDate) ||
          data.createdAt ||
          new Date().toISOString(),
        collectionDate:
          data.collectionDate ||
          (data.labSample && data.labSample.collectionDate) ||
          data.collectedAt ||
          data.createdAt ||
          new Date().toISOString(),
        status:
          data.status ||
          (data.labSample && data.labSample.status) ||
          "Completed",
        tests: rawTests,
      };

      html = generateLabReportHtml({
        hospital,
        labInfo: data.labInfo,
        labSettings: data.labSettings,
        patient: {
          ...patient,
          name: patientName,
          honorific,
          mrn: patientMRN,
          mobile: patientMobile,
          address: patientAddress,
          dob: patientDob,
          gender: patientGender,
          age: patientAge,
        },
        doctor: {
          ...doctor,
          name: doctorName,
        },
        labSample: labSampleObj,
        headerHtml: buildReceiptHeaderHtml(hospital),
        footerHtml: buildReceiptFooterHtml(hospital),
      });

      title = `Lab Report - ${data.testName || "Investigation"}`;
      documentName = `LabReport_${data._id || "report"}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*PATHOLOGY INVESTIGATION REPORT*\n\n*Patient:* ${patientName}\n*Test:* ${data.testName || "Investigation"}\n━━━━━━━━━━━━━━━━━━\n• Official signed lab report.`;
    }

    // ── 6. PHARMACY TAX INVOICE (Exact match with PharmacyBillPrint web portal) ──
    else if (type === "pharmacy" || type === "pharmacy-invoice") {
      const invoiceNo =
        data.invoiceNo ||
        data.invoiceId ||
        data.tokenNumber ||
        `PH-${(data._id || "").slice(-6).toUpperCase()}`;

      const rawDate = data.createdAt || data.billDate || data.prescriptionDate || data.date || new Date().toISOString();
      const invoiceDate = new Date(rawDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const invoiceTime = new Date(rawDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const paymentMode =
        data.paymentSummary?.paymentMode ||
        data.mode ||
        data.paymentMethod ||
        data.paymentMode ||
        "Cash";

      const items: any[] = data.items || data.medicines || [];

      // Calculate totals matching PharmacyBillPrint.tsx
      const subtotalMRP =
        data.paymentSummary?.subtotal ??
        data.subTotal ??
        items.reduce(
          (sum, it) => sum + (Number(it.amount || it.total || (it.qty || it.quantity || 1) * (it.mrp || it.rate || it.unitRate || 0)) || 0),
          0
        );

      const totalDiscount =
        data.paymentSummary?.discount ??
        data.discountTotal ??
        items.reduce((sum, it) => sum + (Number(it.discountValue || it.discount || 0) || 0), 0);

      const netPayable =
        data.paymentSummary?.grandTotal ??
        data.netPayable ??
        data.totalAmount ??
        (subtotalMRP - totalDiscount);

      const paidAmount =
        data.paymentSummary?.paidAmount ??
        data.paid ??
        netPayable;

      const balanceDue =
        data.paymentSummary?.balanceDue ??
        data.balance ??
        0;

      const taxableAmount =
        data.paymentSummary?.taxableAmount ??
        (subtotalMRP - totalDiscount - (data.taxTotal || 0));

      // Calculate per-rate GST breakdown
      const gstMap = new Map<number, number>();
      items.forEach((item: any) => {
        const itemQty = item.qty || item.quantity || 1;
        const itemRate = item.mrp || item.rate || item.unitRate || 0;
        const itemMRP = item.amount || item.total || (itemQty * itemRate);
        const itemWeight = subtotalMRP > 0 ? itemMRP / subtotalMRP : 0;
        const itemDiscount = totalDiscount * itemWeight;
        const itemNetMRP = itemMRP - itemDiscount;
        const rate = Number(item.gstPct || item.gst || 0);
        if (rate > 0) {
          const gstAmt = itemNetMRP - itemNetMRP / (1 + rate / 100);
          gstMap.set(rate, (gstMap.get(rate) || 0) + gstAmt);
        }
      });

      const gstBreakdownRows = Array.from(gstMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(
          ([rate, amount]) => `
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #64748b; padding: 1px 0;">
              <span>GST @${rate}%:</span>
              <span style="color: #6366f1; font-weight: 700;">₹${amount.toFixed(2)}</span>
            </div>`
        )
        .join("");

      const rows =
        items.length > 0
          ? items
              .map((it, idx) => {
                const itemName = it.productName || it.medicineName || it.name || it.item || "Medicine";
                const qty = it.qty || it.quantity || 1;
                const unitRate = Number(it.mrp || it.rate || it.unitRate || 0);
                const disc = Number(it.discountPct || it.discountValue || it.discount || 0);
                const gst = Number(it.gstPct || it.gst || 12);
                const amount = Number(it.amount || it.total || (qty * unitRate));
                let expiry = it.expiryDate || it.exp || it.expiry || "-";
                if (expiry && expiry !== "-") {
                  try {
                    expiry = new Date(expiry).toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" });
                  } catch (e) {}
                }

                return `
                <tr>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${idx + 1}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: left; font-size: 10px; font-weight: 600;">
                    <div style="font-weight: 800; color: #1e293b;">${itemName}</div>
                    ${it.frequency ? `<div style="font-size: 7px; color: #64748b; font-weight: 600; margin-top: 2px; font-style: italic;">Freq: ${typeof it.frequency === 'object' ? 'As Prescribed' : it.frequency}</div>` : ""}
                  </td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${expiry}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-weight: 700;">${qty}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">₹${unitRate.toFixed(2)}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${disc}%</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${gst}%</td>
                  <td style="padding: 8px 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-size: 10px; font-weight: 800; color: #1e293b;">₹${amount.toFixed(2)}</td>
                </tr>`;
              })
              .join("")
          : `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">No items recorded on this invoice</td></tr>`;

      const primaryColor = "#112d42";
      const borderColor = "#cbd5e1";
      const textMain = "#1e293b";
      const textMuted = "#64748b";

      const headerHtml = buildReceiptHeaderHtml(hospital);
      const footerHtml = buildReceiptFooterHtml(hospital);

      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pharmacy Tax Invoice - ${invoiceNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: ${textMain};
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-wrapper {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Main Hospital Header matching Appointment Slip -->
    ${headerHtml}

    <div style="width: 100%; display: flex; flex-direction: column;">
      <!-- Invoice Metadata & Bill To details on the same row -->
      <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; margin-top: 10px; align-items: stretch; width: 100%;">
        <!-- Bill To Section -->
        <div style="flex: 1; border: 1px solid ${borderColor}; border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${primaryColor}; color: white; padding: 4px 15px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: fit-content;">BILL TO</div>
          <div style="padding: 10px 15px;">
            <h3 style="font-size: 15px; font-weight: 800; color: #000; margin: 0 0 5px 0;">${patientName || "PATIENT"}</h3>
            <div style="font-size: 10px; color: ${textMuted}; font-weight: 500; display: flex; flex-direction: column; gap: 2px;">
              ${patientMobile ? `<span>📞 +91 ${patientMobile}</span>` : ""}
              <span>📍 ${patientAddress || hospital.address || "Karnataka, India"}</span>
              <div style="display: flex; gap: 15px; margin-top: 2px;">
                ${patientMRN ? `<span style="font-weight: 600;">MRN: <span style="font-weight: 800;">${patientMRN}</span></span>` : ""}
                <span style="font-weight: 600;">Type: <span style="font-weight: 800;">OPD</span></span>
              </div>
              <span style="margin-top: 4px; font-weight: 800; color: ${textMain};">Doctor: <span style="font-weight: 500;">${doctorName || "Self / Walk-in"}</span></span>
            </div>
          </div>
        </div>

        <!-- Tax Invoice Details Box -->
        <div style="width: 250px; flex-shrink: 0; border: 1.5px solid ${primaryColor}; border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${primaryColor}; color: white; text-align: center; padding: 5px 0; font-weight: 800; font-size: 12px; text-transform: uppercase;">TAX INVOICE</div>
          <div style="padding: 6px 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${textMuted}; font-weight: 500;">Invoice No:</span>
              <span style="font-weight: 700; color: ${textMain};">${invoiceNo}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${textMuted}; font-weight: 500;">Invoice Date:</span>
              <span style="font-weight: 700; color: ${textMain};">${invoiceDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${textMuted}; font-weight: 500;">Invoice Time:</span>
              <span style="font-weight: 700; color: ${textMain};">${invoiceTime}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${textMuted}; font-weight: 500;">Payment Mode:</span>
              <span style="font-weight: 700; color: ${textMain};">${paymentMode}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px;">
              <span style="color: ${textMuted}; font-weight: 500;">Status:</span>
              <span style="font-weight: 800; color: #16a34a;">PAID</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Itemized Medicines Table -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; border: 1px solid ${borderColor};">
        <thead>
          <tr>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 35px; text-align: center;">S.NO</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); text-align: left;">ITEM NAME</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 65px; text-align: center;">EXPIRY</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 45px; text-align: center;">QTY</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 65px; text-align: center;">MRP</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 55px; text-align: center;">DISC%</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 55px; text-align: center;">GST%</th>
            <th style="background-color: ${primaryColor}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 75px; text-align: right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Calculations and Payment Details -->
      <div style="display: flex; justify-content: space-between; gap: 30px; margin-top: 10px; width: 100%;">
        <!-- Left: Calculations -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: ${textMuted}; padding: 1px 0;">
            <span>MRP Total:</span>
            <span style="color: ${textMain}; font-weight: 700;">₹${subtotalMRP.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: ${textMuted}; padding: 1px 0;">
            <span>Discount:</span>
            <span style="color: ${textMain}; font-weight: 700;">-₹${totalDiscount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: ${textMuted}; padding: 1px 0;">
            <span>Base Price (Excl. GST):</span>
            <span style="color: ${textMain}; font-weight: 700;">₹${taxableAmount.toFixed(2)}</span>
          </div>
          ${gstBreakdownRows}
          <div style="background-color: ${primaryColor}; color: white; display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-radius: 4px; margin-top: 12px;">
            <span style="font-size: 13px; font-weight: 800; text-transform: uppercase;">Grand Total:</span>
            <span style="font-size: 24px; font-weight: 900;">₹${Math.round(netPayable).toLocaleString()}</span>
          </div>
        </div>

        <!-- Right: Payment Box & Get Well Soon Card -->
        <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
          <div style="border: 1px solid ${borderColor}; border-radius: 4px; overflow: hidden;">
            <div style="background-color: ${primaryColor}; color: white; padding: 5px 15px; font-size: 11px; font-weight: 800; text-align: center;">Payment Details</div>
            <div style="padding: 8px 12px; background-color: #f8fafc;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; border-bottom: 1px solid ${borderColor}; padding-bottom: 3px;">
                <span style="color: ${textMuted}; font-weight: 500;">Paid Amount:</span>
                <span style="font-weight: 700; color: ${textMain};">₹${Math.round(paidAmount).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; border-bottom: 1px solid ${borderColor}; padding-bottom: 3px;">
                <span style="color: ${textMuted}; font-weight: 500;">Balance:</span>
                <span style="font-weight: 700; color: ${textMain};">₹${Math.round(balanceDue).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: ${textMuted}; font-weight: 500;">Payment Mode:</span>
                <span style="font-weight: 700; color: ${textMain};">${paymentMode}</span>
              </div>
            </div>
          </div>

          <!-- Get Well Soon Card matching Screenshot 5 -->
          <div style="text-align: center; padding: 10px; background: #f8fafc; border-radius: 10px; border: 1px solid ${borderColor};">
            <div style="color: ${primaryColor}; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 20px; margin-bottom: 2px;">Get Well Soon!</div>
            <div style="font-weight: 800; font-size: 11px; color: ${primaryColor};">${hospital.name || "Pharma Store"}</div>
            <div style="font-size: 9px; color: ${textMuted};">Support: ${hospital.phone || hospital.contact || "-"}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pinned Footer matching Appointment Slip -->
    <div style="margin-top: auto; padding-top: 15px;">
      ${footerHtml}
    </div>
  </div>
</body>
</html>`;

      title = `Pharmacy Tax Invoice - ${invoiceNo}`;
      documentName = `PharmacyInvoice_${invoiceNo}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*PHARMACY RETAIL TAX INVOICE*\n\n*Patient:* ${patientName}\n*Invoice #:* ${invoiceNo}\n*Amount:* ₹${netPayable}\n━━━━━━━━━━━━━━━━━━\n• Dispensed medicines tax invoice attached.`;
    }

    // ── 7. DISCHARGE SUMMARY ──
    else if (type === "discharge-summary" || type === "discharge") {
      const rec = data.record || data;
      const admission = rec.admission || data.admission || rec;
      html = generateDischargeSummaryHTML(hospital, patient, admission, rec, rec.dischargeData || rec);

      title = `Discharge Summary - ${patientName || "Patient"}`;
      documentName = `DischargeSummary_${data._id || "record"}.pdf`;
      caption = `*HOSPITAL DISCHARGE SUMMARY*\n━━━━━━━━━━━━━━━━━━\n*Patient:* ${patientName}\n*MRN:* ${patientMRN}\n*Discharge Date:* ${rec.dischargeDate || ""}\n━━━━━━━━━━━━━━━━━━\n• Official clinical discharge summary attached.`;
    }

    // ── 8. DISCHARGE SETTLEMENT BILL ──
    else if (type === "discharge-settlement" || type === "final-bill") {
      // Use the full IP Interim/Final Bill - Detailed report (same as frontend portal)
      const rd = data.reportData || {};
      const admissionObj = data.admission || data.admissionInfo || {};
      const ptInfo = data.patientInfo || {};

      // Resolve patient object with all available fields
      const resolvedPatient = {
        ...patient,
        ...(typeof data.patient === "object" ? data.patient : {}),
        ...(ptInfo || {}),
        name: patientName,
        mrn: patientMRN || ptInfo.mrn || "",
        mobile: patientMobile || ptInfo.mobile || ptInfo.phone || "",
        address: patientAddress || ptInfo.address || "",
        age: patientAge || ptInfo.age || "",
        gender: patientGender || ptInfo.gender || "",
        dob: patientDob || ptInfo.dob || "",
        honorific: honorific || ptInfo.honorific || "",
        profile: {
          ...(patient.profile || {}),
          guardianName: ptInfo.guardianName || patient.profile?.guardianName || data.patientDetails?.guardianName || "",
          GuardianName: ptInfo.GuardianName || patient.profile?.GuardianName || data.patientDetails?.GuardianName || "",
          mrn: patientMRN || ptInfo.mrn || "",
        },
      };

      // Resolve admission/IPD details
      const resolvedAdmission = {
        ...admissionObj,
        status: data.dischargeDate || (admissionObj as any).dischargeDate || (admissionObj as any).status === "Discharged" ? "Discharged" : (admissionObj as any).status || "Active",
        admissionDate: (admissionObj as any).admissionDate || data.admissionDate || "",
        dischargeDate: (admissionObj as any).dischargeDate || data.dischargeDate || "",
        admissionId: (admissionObj as any).admissionId || (admissionObj as any).ipNo || data.ipNo || "",
        wardName: (admissionObj as any).wardName || (admissionObj as any).ward?.name || data.roomType || "",
        bedNumber: (admissionObj as any).bedNumber || (admissionObj as any).bedId || data.bedNo || "",
        doctorName: (admissionObj as any).doctorName || data.primaryDoctor || doctorName || "",
        dischargeType: (admissionObj as any).dischargeType || data.dischargeType || "",
        organization: (admissionObj as any).organization || data.insuranceName || "",
      };

      // Build reportData from whatever we have (IPD final bill shape)
      const reportDataForTemplate = {
        doctors: rd.doctors || [],
        admissions: rd.admissions || [],
        diags: rd.diags || [],
        rads: rd.rads || [],
        services: rd.services || [],
        meds: rd.meds || [],
        payments: rd.payments || data.receipts || [],
      };

      // Build totals
      const t = data.totals || {};
      const grandTotal = (t as any).grandTotal ?? (t as any).netAmount ?? data.totalBillAmount ?? data.totalAmount ?? data.amount ?? 0;
      const totalPaid = (t as any).totalPaid ?? (t as any).paidAmt ?? data.totalPaidAmount ?? data.paidAmount ?? data.advanceAmount ?? 0;
      const balance = (t as any).balance ?? (grandTotal - totalPaid);
      const discount = (t as any).discount ?? data.discountAmount ?? 0;

      const resolvedTotals = { grandTotal, totalPaid, balance, discount };

      // printConfig — show everything
      const printConfig = { consultations: true, investigations: true, wards: true, radiology: true, services: true, pharmacy: true, receipts: true };

      // Resolve hospital with IPD bill hospital info if available
      const resolvedHospital = {
        ...hospital,
        ...(data.hospitalInfo || {}),
        name: hospital.name || (data.hospitalInfo as any)?.name || "",
        address: hospital.address || (data.hospitalInfo as any)?.address || "",
        phone: hospital.phone || hospital.contact || (data.hospitalInfo as any)?.phone || "",
        logo: hospital.logo || (data.hospitalInfo as any)?.logo || "",
        gstNumber: hospital.gstNumber || hospital.gst || (data.hospitalInfo as any)?.gstNumber || "",
        cinNumber: hospital.cinNumber || hospital.cin || (data.hospitalInfo as any)?.cinNumber || "",
      };

      html = generateTransactionReportHTML(resolvedHospital, resolvedPatient, resolvedAdmission, reportDataForTemplate, resolvedTotals, printConfig);

      const billTypeLabel = resolvedAdmission.status === "Discharged" ? "IP Final Bill" : "IP Interim Bill";
      title = `${billTypeLabel} - ${patientName || "Patient"}`;
      documentName = `${billTypeLabel.replace(/ /g, "_")}_${data._id || "bill"}.pdf`;
      caption = `*${billTypeLabel.toUpperCase()} - DETAILED*\n━━━━━━━━━━━━━━━━━━\n*Patient:* ${patientName}\n*MRN:* ${patientMRN}\n*Grand Total:* ₹${grandTotal}\n*Paid:* ₹${totalPaid}\n*Balance:* ₹${balance}\n━━━━━━━━━━━━━━━━━━\n• Official IP Interim/Final Bill - Detailed attached.`;
    }

    return NextResponse.json({
      success: true,
      type,
      id: data._id || data.appointmentId || "rendered",
      html,
      title,
      documentName,
      caption,
    });
  } catch (error: any) {
    console.error("[POST /api/receipts/render Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to render official receipt" },
      { status: 500 }
    );
  }
}
