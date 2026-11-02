import { NextRequest, NextResponse } from "next/server";
import {
  generateClinicalReceiptHtml,
  generateOPDRegistrationSlipHtml,
  generatePrescriptionHtml,
  generateLabTokenHtml,
  generateLabReceiptHtml,
  generateLabReportHtml,
  generateAddBillsReceiptHtml,
} from "@/lib/print-utils";
import { generateDischargeSummaryHTML } from "@/lib/utils/print-discharge-summary";

const rawBackend =
  process.env.BACKEND_INTERNAL_URL?.trim().replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
  "http://localhost:5003/api";
const BACKEND_BASE = /^https?:\/\//i.test(rawBackend)
  ? rawBackend
  : `https://${rawBackend}`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const authHeader = req.headers.get("authorization") || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    let html = "";
    let title = "Hospital Document";
    let documentName = `Receipt_${id}.pdf`;
    let caption = "Here is your official hospital record.";

    // ── 1. DOCTOR PRESCRIPTION ──
    if (type === "prescription") {
      const res = await fetch(`${BACKEND_BASE}/prescriptions/${id}`, { headers });
      const json = await res.json();
      const prescriptionData = json.data || json.prescription || json;

      const hospital = prescriptionData.hospital || {};
      const patient = prescriptionData.patient || prescriptionData.patientId || {};
      const doctor = prescriptionData.doctor || prescriptionData.doctorId || {};

      html = generatePrescriptionHtml({
        hospital,
        patient,
        doctor,
        prescription: prescriptionData,
        appointment: prescriptionData.appointment,
      });
      title = `Prescription - ${patient.name || patient.fullName || "Patient"}`;
      documentName = `Prescription_${id}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*DOCTOR PRESCRIPTION*\n\n*Patient:* ${patient.name || patient.fullName || "Patient"}\n*Doctor:* ${doctor.name || "Doctor"}\n*Date:* ${prescriptionData.prescriptionDate || new Date().toLocaleDateString("en-IN")}\n━━━━━━━━━━━━━━━━━━\n• Find your official prescription PDF attached.`;
    }

    // ── 2. APPOINTMENT / OPD / IPD CONSULTATION RECEIPT ──
    else if (type === "appointment" || type === "consultation") {
      const res = await fetch(`${BACKEND_BASE}/bookings/${id}`, { headers });
      const json = await res.json();
      const apptData = json.data || json.appointment || json.booking || json;

      const hospital = apptData.hospital || {};
      const patient = apptData.patient || apptData.patientDetails || {};
      const payment = apptData.payment || {
        amount: apptData.amount || apptData.fee || 0,
        status: apptData.paymentStatus || "PAID",
        mode: apptData.paymentMethod || "UPI",
      };

      html = generateClinicalReceiptHtml({
        hospital,
        patient,
        appointment: apptData,
        payment,
      });
      title = `Appointment Receipt - ${patient.name || patient.fullName || "Patient"}`;
      documentName = `AppointmentReceipt_${id}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*OPD CONSULTATION RECEIPT*\n\n*Patient:* ${patient.name || patient.fullName || "Patient"}\n*Doctor:* ${apptData.doctorName || apptData.doctor?.name || "Doctor"}\n*Token No:* #${apptData.tokenNumber || apptData.tokenNo || ""}\n*Amount:* ₹${payment.amount || 0} (${String(payment.status).toUpperCase()})\n━━━━━━━━━━━━━━━━━━\n• Show this receipt at hospital frontdesk.`;
    }

    // ── 3. LAB TOKEN SLIP ──
    else if (type === "lab-token") {
      const res = await fetch(`${BACKEND_BASE}/lab/bookings/${id}`, { headers });
      const json = await res.json();
      const labData = json.data || json;

      const hospital = labData.hospital || {};
      const patient = labData.patient || {};
      const doctor = labData.doctor || {};

      html = generateLabTokenHtml({
        hospital,
        patient,
        doctor,
        appointment: labData,
        tests: labData.tests || labData.testNames || [],
        token: labData.tokenNumber || labData.tokenNo || id,
        sampleId: labData.sampleId || id,
      });
      title = `Lab Token - ${patient.name || patient.fullName || "Patient"}`;
      documentName = `LabToken_${id}.pdf`;
      caption = `*${(hospital.name || "HOSPITAL").toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n*LAB PHLEBOTOMY TOKEN*\n\n*Patient:* ${patient.name || patient.fullName || "Patient"}\n*Token No:* #${labData.tokenNumber || id}\n━━━━━━━━━━━━━━━━━━\n• Present this token at sample collection counter.`;
    }

    // ── 4. LAB INVOICE / BILLING RECEIPT ──
    else if (type === "lab-invoice" || type === "lab-bill") {
      const res = await fetch(`${BACKEND_BASE}/lab/bookings/${id}`, { headers });
      const json = await res.json();
      const labData = json.data || json;

      const hospital = labData.hospital || {};
      const patient = labData.patient || {};
      const payment = labData.payment || {
        amount: labData.amount || labData.totalAmount || 0,
        status: labData.paymentStatus || "PAID",
        mode: labData.paymentMode || "CASH",
      };

      html = generateLabReceiptHtml({
        hospital,
        patient,
        appointment: labData,
        payment,
        tests: labData.tests || [],
        invoiceNo: labData.invoiceNo || `LAB-INV-${id.slice(-6).toUpperCase()}`,
      });
      title = `Lab Invoice - ${patient.name || "Patient"}`;
      documentName = `LabInvoice_${id}.pdf`;
      caption = `*${hospital.name?.toUpperCase() || "HOSPITAL"}*\n━━━━━━━━━━━━━━━━━━\n*DIAGNOSTIC TEST INVOICE*\n\n*Patient:* ${patient.name || "Patient"}\n*Amount:* ₹${payment.amount || 0}\n━━━━━━━━━━━━━━━━━━\n• Tax invoice for lab diagnostics.`;
    }

    // ── 5. LAB INVESTIGATION REPORT (NABL Pathology Results) ──
    else if (type === "lab-report") {
      const res = await fetch(`${BACKEND_BASE}/lab/reports/${id}`, { headers });
      const json = await res.json();
      const reportData = json.data || json.report || json;

      const hospital = reportData.hospital || {};
      const patient = reportData.patient || {};

      html = generateLabReportHtml({
        hospital,
        patient,
        doctor: reportData.doctor,
        report: reportData,
        tests: reportData.tests || reportData.results || [],
        specimen: reportData.specimen || "Blood",
      });
      title = `Lab Report - ${reportData.testName || "Investigation"}`;
      documentName = `LabReport_${id}.pdf`;
      caption = `*${hospital.name?.toUpperCase() || "HOSPITAL"}*\n━━━━━━━━━━━━━━━━━━\n*PATHOLOGY INVESTIGATION REPORT*\n\n*Patient:* ${patient.name || "Patient"}\n*Test:* ${reportData.testName || "Investigation"}\n*Date:* ${new Date().toLocaleDateString("en-IN")}\n━━━━━━━━━━━━━━━━━━\n• Official signed lab report attached.`;
    }

    // ── 6. PHARMACY TAX INVOICE ──
    else if (type === "pharmacy" || type === "pharmacy-invoice") {
      const res = await fetch(`${BACKEND_BASE}/pharmacy/bills/${id}`, { headers });
      const json = await res.json();
      const billData = json.data || json.bill || json;

      const shopDetails = {
        name: billData.hospital?.name ? `${billData.hospital.name} PHARMACY` : "HOSPITAL PHARMACY",
        address: billData.hospital?.address || "",
        phone: billData.hospital?.phone || "",
        email: billData.hospital?.email || "",
        gstin: billData.gstin || billData.hospital?.gstin || "",
        dlNo: billData.dlNo || billData.hospital?.dlNo || "",
      };

      // Wrap pharmacy bill in standard responsive HTML matching PharmacyBillPrint
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pharmacy Invoice - ${billData.invoiceId || id}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
    .header { border-bottom: 2px solid #112d42; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .title { font-size: 24px; font-weight: 800; color: #112d42; margin: 0; }
    .meta { font-size: 11px; color: #64748b; line-height: 1.5; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: left; }
    .table th { background: #f8fafc; color: #112d42; font-weight: 700; }
    .total-box { margin-top: 20px; text-align: right; font-size: 13px; font-weight: 800; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${shopDetails.name}</h1>
      <div class="meta">${shopDetails.address ? `${shopDetails.address}<br/>` : ""}${shopDetails.dlNo ? `DL No: ${shopDetails.dlNo} | ` : ""}${shopDetails.gstin ? `GSTIN: ${shopDetails.gstin}` : ""}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 16px; color: #112d42;">TAX INVOICE</h2>
      <div class="meta">Invoice #: <strong>${billData.invoiceId || id}</strong><br/>Date: ${new Date(billData.createdAt || Date.now()).toLocaleDateString("en-IN")}</div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
    <div class="meta"><strong>Patient:</strong> ${billData.patientName || "Patient"}<br/><strong>MRN:</strong> ${billData.mrn || "N/A"}</div>
    <div class="meta" style="text-align: right;"><strong>Doctor:</strong> ${billData.doctorName || "Doctor"}<br/><strong>Payment Mode:</strong> ${billData.paymentSummary?.paymentMode || "CASH"}</div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>#</th>
        <th>Item / Medicine</th>
        <th>Batch</th>
        <th>Exp</th>
        <th>Qty</th>
        <th>MRP</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${(billData.items || []).map((it: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${it.medicineName || it.name}</strong></td>
          <td>${it.batchNumber || "—"}</td>
          <td>${it.expiryDate || "—"}</td>
          <td>${it.quantity}</td>
          <td>₹${it.price || it.mrp || 0}</td>
          <td>₹${(Number(it.quantity || 1) * Number(it.price || it.mrp || 0)).toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="total-box">
    Grand Total: ₹${billData.paymentSummary?.grandTotal || billData.totalAmount || 0}
  </div>

  <div class="footer">
    This is a computer-generated Retail Pharmacy Invoice issued under authorized Drug License.
  </div>
</body>
</html>`;
      title = `Pharmacy Invoice - ${billData.invoiceId || id}`;
      documentName = `PharmacyInvoice_${id}.pdf`;
      caption = `*${shopDetails.name}*\n━━━━━━━━━━━━━━━━━━\n*PHARMACY MEDICINE INVOICE*\n\n*Invoice No:* ${billData.invoiceId || id}\n*Total:* ₹${billData.paymentSummary?.grandTotal || 0}\n━━━━━━━━━━━━━━━━━━\n• Tax invoice attached.`;
    }

    // ── 7. INPATIENT DISCHARGE SUMMARY ──
    else if (type === "discharge-summary" || type === "discharge") {
      const res = await fetch(`${BACKEND_BASE}/discharge/records/patient-view/${id}`, { headers });
      const json = await res.json();
      const rec = json.data || json.record || json;

      const hospital = rec.hospital || {};
      const patient = rec.patient || {};
      const admission = rec.admission || rec;

      html = generateDischargeSummaryHTML(hospital, patient, admission, rec, rec.dischargeData || rec);
      title = `Discharge Summary - ${patient.name || "Patient"}`;
      documentName = `DischargeSummary_${id}.pdf`;
      caption = `*${hospital.name?.toUpperCase() || "HOSPITAL"}*\n━━━━━━━━━━━━━━━━━━\n*INPATIENT DISCHARGE SUMMARY*\n\n*Patient:* ${patient.name || "Patient"}\n*IP No:* ${admission.ipdNo || admission.admissionId || "N/A"}\n*Discharge Date:* ${new Date().toLocaleDateString("en-IN")}\n━━━━━━━━━━━━━━━━━━\n• Complete clinical discharge record attached.`;
    }

    // ── 8. FINAL DISCHARGE SETTLEMENT BILL ──
    else if (type === "discharge-settlement" || type === "final-bill") {
      const res = await fetch(`${BACKEND_BASE}/frontdesk/final-bill/${id}`, { headers });
      const json = await res.json();
      const billData = json.data || json;

      const hospital = billData.hospital || {};
      const patient = billData.patient || {};

      html = generateClinicalReceiptHtml({
        hospital,
        patient,
        appointment: { ...billData, type: "DISCHARGE_SETTLEMENT" },
        payment: {
          totalBillAmount: billData.totalAmount || billData.grossTotal || 0,
          advanceAmount: billData.advancePaid || 0,
          discount: billData.discount || 0,
          amount: billData.netSettlementPaid || 0,
          status: "paid",
          isDischarge: true,
        },
        forceDetailed: true,
      });
      title = `Final Bill - ${patient.name || "Patient"}`;
      documentName = `DischargeSettlement_${id}.pdf`;
      caption = `*${hospital.name?.toUpperCase() || "HOSPITAL"}*\n━━━━━━━━━━━━━━━━━━\n*FINAL DISCHARGE SETTLEMENT*\n\n*Patient:* ${patient.name || "Patient"}\n*IP No:* ${billData.admissionId || "N/A"}\n*Zero Balance Settlement Paid*\n━━━━━━━━━━━━━━━━━━\n• Hospital final clearance receipt attached.`;
    } else {
      return NextResponse.json({ success: false, error: `Unknown receipt type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      id,
      html,
      title,
      documentName,
      caption,
    });
  } catch (error: any) {
    console.error("[Receipt Route Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
