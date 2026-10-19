import { formatDoctorName, formatPatientDisplayName } from '@/lib/utils/name-utils';
import { calculateExactAge } from '@/lib/utils/date-utils';

export interface DischargeMedicine {
    id?: string;
    medicineName: string;
    dose: string;
    frequency: string;
    duration: string;
    quantity?: string;
}

export interface DischargeSummaryData {
    chiefComplaints?: string;
    historyOfPresentIllness?: string;
    pastMedicalHistory?: string;
    examinationFindings?: string;
    provisionalDiagnosis?: string;
    finalDiagnosis?: string;
    investigations?: string;
    treatmentAndCourse?: string;
    conditionAtDischarge?: string;
    dischargeMedications?: DischargeMedicine[];
    dietAndActivityAdvice?: string;
    woundCarePrecautions?: string;
    followUpDate?: string;
    warningSymptoms?: string;
}

const formatDate = (d: any): string => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

export const generateDischargeSummaryHTML = (
    hospital: any,
    patient: any,
    admission: any,
    reportData: any,
    dischargeData?: DischargeSummaryData,
    options?: {
        headerHtml?: string;
        footerHtml?: string;
    }
): string => {
    // 1. Dynamic Hospital Header Fallbacks
    const hospName = hospital?.name || 'HORIZIN HOSPITAL';
    const hospAddress = hospital?.address || 'MDR0379, RTC colony, Kadapa, YSR Kadapa, Andhra Pradesh';
    const hospContact = hospital?.phone || hospital?.mobile || hospital?.contact || '9876543210';
    const hospEmail = hospital?.email || 'harizon@gmail.com';

    // 2. Dynamic Patient Data Extraction
    const patientName = formatPatientDisplayName(patient, admission) || 'PATIENT NAME';

    // Age / Sex
    const patientDob = patient?.dob || patient?.profile?.dob || patient?.patientDetails?.dob || patient?.dateOfBirth || patient?.user?.dateOfBirth;
    const encounterDate = admission?.admissionDate || admission?.createdAt || reportData?.date || new Date();
    const ageCalc = calculateExactAge(patientDob, new Date(encounterDate));
    const ageText = ageCalc.display !== "N/A"
        ? (ageCalc.years >= 2 ? `${ageCalc.years} Y` : ageCalc.shortDisplay)
        : (patient?.age || patient?.profile?.age ? `${patient?.age || patient?.profile?.age} ${patient?.ageUnit || patient?.profile?.ageUnit || patient?.patientDetails?.ageUnit || 'Y'}` : '');
    const genderRaw = patient?.gender || patient?.profile?.gender || patient?.patientDetails?.gender || patient?.user?.gender || '';
    const genderText = genderRaw ? (genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1)) : '';
    const ageSexDisplay = [ageText, genderText].filter(Boolean).join(' / ') || 'N/A';

    // IP No / UHID
    const uhid = patient?.mrn || patient?.user?.mrn || patient?.profile?.mrn || patient?.umr || patient?.patientId || patient?.user?._id || patient?._id || 'N/A';
    const ipNo = admission?.admissionId || admission?.ipdNo || admission?.ipNumber || (admission?._id ? `IP-${String(admission._id).slice(-6).toUpperCase()}` : 'N/A');
    const ipUhidDisplay = ipNo !== 'N/A' && uhid !== 'N/A' ? `${ipNo} / ${uhid}` : (ipNo !== 'N/A' ? ipNo : uhid);

    // Dates
    const admissionDateStr = formatDate(admission?.admissionDate || admission?.createdAt || encounterDate);
    const dischargeDateStr = formatDate(admission?.dischargeDate || new Date());

    // Consultant Doctor
    const doctorCharge = reportData?.doctors?.length > 0 ? reportData.doctors[0] : null;
    let fallbackDoctor = doctorCharge?.doctorName || doctorCharge?.serviceName || '';
    if (fallbackDoctor.toLowerCase().includes('consultation')) {
        fallbackDoctor = fallbackDoctor.replace(/consultation/i, '').trim();
    }
    if (!fallbackDoctor) {
        fallbackDoctor = admission?.doctorName || admission?.doctor?.name || admission?.primaryDoctor?.user?.name || patient?.activeConsultation?.doctor?.user?.name || patient?.lastVisit?.doctor?.user?.name || '';
    }
    const consultantDoctorName = formatDoctorName(fallbackDoctor || 'Dr. Consultant Incharge');

    // Ward / Bed No
    const wardCharge = reportData?.admissions?.length > 0 ? reportData.admissions[reportData.admissions.length - 1] : null;
    let ward = admission?.wardName || admission?.ward?.name || admission?.bed?.wardName || admission?.bed?.type || '';
    let bed = admission?.bedNumber || admission?.bed?.bedId || admission?.bed?.number || admission?.bedId || '';
    if (!ward && wardCharge?.chargeType) {
        const match = wardCharge.chargeType.match(/Bed\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (match) {
            bed = match[1];
            ward = match[2];
        } else {
            ward = wardCharge.chargeType;
        }
    }
    const wardBedDisplay = [ward, bed ? `Bed ${bed}` : ''].filter(Boolean).join(' / ') || 'General Ward';

    // 3. Clinical Summary Information (Dynamic from admission/patient data or user inputs)
    const chiefComplaints = dischargeData?.chiefComplaints !== undefined
        ? dischargeData.chiefComplaints
        : (admission?.chiefComplaints || admission?.reasonForAdmission || patient?.chiefComplaints || '');

    const historyOfPresentIllness = dischargeData?.historyOfPresentIllness !== undefined
        ? dischargeData.historyOfPresentIllness
        : (admission?.historyOfPresentIllness || '');

    const pastMedicalHistory = dischargeData?.pastMedicalHistory !== undefined
        ? dischargeData.pastMedicalHistory
        : (admission?.pastMedicalHistory || patient?.medicalHistory || '');

    const examinationFindings = dischargeData?.examinationFindings !== undefined
        ? dischargeData.examinationFindings
        : (admission?.examinationFindings || '');

    const provisionalDiagnosis = dischargeData?.provisionalDiagnosis !== undefined
        ? dischargeData.provisionalDiagnosis
        : (admission?.provisionalDiagnosis || admission?.diagnosis || patient?.provisionalDiagnosis || '');

    const finalDiagnosis = dischargeData?.finalDiagnosis !== undefined
        ? dischargeData.finalDiagnosis
        : (admission?.finalDiagnosis || admission?.diagnosis || provisionalDiagnosis || '');

    // Dynamic Investigations from reportData diagnostics if not manually specified
    let defaultInvestigations = '';
    if (reportData?.diags && Array.isArray(reportData.diags) && reportData.diags.length > 0) {
        defaultInvestigations = reportData.diags.map((d: any) => d.testName || d.serviceName || d.name).filter(Boolean).join(', ');
    }
    if (reportData?.rads && Array.isArray(reportData.rads) && reportData.rads.length > 0) {
        const radList = reportData.rads.map((r: any) => r.testName || r.serviceName || r.name).filter(Boolean).join(', ');
        defaultInvestigations = defaultInvestigations ? `${defaultInvestigations}, ${radList}` : radList;
    }
    const investigations = dischargeData?.investigations !== undefined ? dischargeData.investigations : defaultInvestigations;

    const treatmentAndCourse = dischargeData?.treatmentAndCourse !== undefined
        ? dischargeData.treatmentAndCourse
        : (admission?.treatmentGiven || admission?.hospitalCourse || '');

    const conditionAtDischarge = dischargeData?.conditionAtDischarge !== undefined
        ? dischargeData.conditionAtDischarge
        : (admission?.conditionAtDischarge || 'Stable');

    // 4. Discharge Medications (Manually entered or mapped - no dummy/duplicate items)
    const meds: DischargeMedicine[] = dischargeData?.dischargeMedications || [];

    // 5. Discharge Advice
    const dietAdvice = dischargeData?.dietAndActivityAdvice !== undefined
        ? dischargeData.dietAndActivityAdvice
        : (admission?.dietAdvice || 'Normal soft diet & adequate fluid intake');

    const woundCare = dischargeData?.woundCarePrecautions !== undefined
        ? dischargeData.woundCarePrecautions
        : (admission?.woundCare || 'Keep cannula / incision site clean and dry');

    const followUpDateStr = dischargeData?.followUpDate
        ? formatDate(dischargeData.followUpDate)
        : formatDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));

    const hospLogo = hospital?.logo || '';
    const hospGst = hospital?.gstNumber || '';

    // Helper functions to generate MainHeader and MainFooter matching appointment slips
    const renderHeader = (headerHtml?: string): string => {
        if (headerHtml) return headerHtml;
        return `
        <div class="main-header-container" style="width: 100%; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-bottom: 8px; padding: 0; box-sizing: border-box;">
            <div style="display: flex; align-items: center; justify-content: flex-start; gap: 16px; padding: 2px 0; width: 100%; box-sizing: border-box;">
                <!-- Logo Section -->
                <div style="flex: 0 0 auto;">
                    ${hospLogo ? `
                        <img src="${hospLogo}" alt="Hospital Logo" style="width: 75px; height: 75px; object-fit: contain;" />
                    ` : `
                        <div style="width: 68px; height: 68px; border: 1.5px solid #1e3a8a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-size: 10px; font-weight: bold; text-transform: uppercase;">LOGO</div>
                    `}
                </div>

                <!-- Vertical Divider Line -->
                <div style="width: 2px; height: 58px; background-color: #1e3a8a; opacity: 0.15;"></div>

                <!-- Details Section -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                    <h1 style="margin: 0; font-weight: 900; color: #1e3a8a; line-height: 1.1; font-size: 21px; text-transform: uppercase; letter-spacing: -0.3px;">
                        ${hospName}
                    </h1>
                    
                    ${hospEmail && hospEmail !== 'N/A' && hospEmail !== 'Email Address' ? `
                        <div style="display: flex; align-items: center; gap: 5px; color: #1e40af; font-size: 11px; font-weight: 700; margin-top: 1px;">
                            <div style="width: 13px; height: 13px; background-color: #1e3a8a; border-radius: 2px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                            <span>${hospEmail}</span>
                        </div>
                    ` : ''}

                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 10px; color: #475569; font-weight: 600; margin-top: 1px; width: 100%;">
                        ${hospAddress && hospAddress !== 'N/A' && hospAddress !== 'Hospital Address' ? `
                            <span style="color: #64748b;">${hospAddress}</span>
                        ` : ''}

                        ${hospContact && hospContact !== 'N/A' && hospContact !== 'Phone Number' ? `
                            <div style="display: flex; align-items: center; gap: 4px; ${hospAddress ? 'margin-left: 4px;' : ''}">
                                <div style="width: 14px; height: 14px; background-color: #22c55e; border-radius: 3px; display: flex; align-items: center; justify-content: center;">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </div>
                                <span style="color: #16a34a; font-weight: 800;">${hospContact}</span>
                            </div>
                        ` : ''}

                        ${hospGst && hospGst !== 'N/A' ? `
                            <span style="color: #1e3a8a; font-weight: 800;">
                                GST No: ${hospGst}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Bottom Accent line -->
            <div style="width: 100%; height: 3.5px; background-color: #10b981; margin-top: 6px; border-radius: 2px;"></div>
        </div>`;
    };

    const renderFooter = (footerHtml?: string): string => {
        if (footerHtml) return footerHtml;
        return `
        <div class="main-footer-container" style="width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 10px; box-sizing: border-box;">
            <!-- Top separator line -->
            <div style="width: 100%; height: 3px; background-color: #10b981; border-radius: 2px; margin-bottom: 6px;"></div>

            <!-- Contact Badges / Pills -->
            <div style="display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; margin-bottom: 5px;">
                ${hospContact && hospContact !== 'N/A' && hospContact !== 'Phone Number' ? `
                    <div style="flex: 1; min-width: 140px; background: #22c55e; color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 5px 12px; border-radius: 6px; font-weight: 900; font-size: 11px; letter-spacing: 0.5px; gap: 6px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span>${hospContact}</span>
                    </div>
                ` : ''}
                ${hospEmail && hospEmail !== 'N/A' && hospEmail !== 'Email Address' ? `
                    <div style="flex: 2; min-width: 180px; background: #1e3a8a; color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 5px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; gap: 6px;">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span>${hospEmail}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Address & name row -->
            ${hospAddress && hospAddress !== 'N/A' && hospAddress !== 'Hospital Address' ? `
                <div style="text-align: center; font-size: 8.5pt; color: #64748b; font-weight: 500; line-height: 1.35; padding-bottom: 2px;">
                    ${hospName ? `<span style="font-weight: 700; color: #1e3a8a;">${hospName} &mdash; </span>` : ''}
                    ${hospAddress}
                </div>
            ` : ''}
        </div>`;
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Discharge Summary - ${patientName}</title>
    <style>
        @page {
            size: A4;
            margin: 8mm 10mm 8mm 10mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10.5pt;
            line-height: 1.4;
        }
        .page {
            padding: 2mm;
            width: 100%;
            min-height: 278mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
        }
        .page-body {
            flex: 1 0 auto;
        }
        .page-break {
            page-break-before: always;
            break-before: page;
            clear: both;
        }

        /* Title */
        .doc-title {
            text-align: center;
            font-size: 12.5pt;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 4px 0 10px 0;
            color: #0f172a;
        }

        /* Section Headings */
        .section-title {
            font-size: 11pt;
            font-weight: 800;
            color: #0f172a;
            margin: 12px 0 6px 0;
        }

        /* Patient Details Table */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .details-table td {
            padding: 3px 0;
            font-size: 10pt;
            vertical-align: middle;
        }
        .details-table .label {
            width: 22%;
            font-weight: 600;
            color: #1e293b;
        }
        .details-table .value-line {
            width: 78%;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 700;
            color: #0f172a;
            padding-left: 6px;
        }

        /* Clinical Summary Blocks */
        .field-group {
            margin-bottom: 10px;
        }
        .field-label {
            font-size: 10.5pt;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 3px;
        }
        .field-value {
            font-size: 10pt;
            color: #334155;
            min-height: 24px;
            line-height: 1.45;
            padding: 4px 6px;
            border-bottom: 1px solid #e2e8f0;
            word-break: break-word;
        }

        .helper-text {
            font-size: 8.5pt;
            color: #64748b;
            font-style: italic;
            margin: 0 0 4px 0;
        }

        /* Medication Table */
        .med-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0 14px 0;
            font-size: 9.5pt;
        }
        .med-table th {
            border-bottom: 1.5px solid #0f172a;
            border-top: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-weight: 700;
            color: #0f172a;
            background-color: #f8fafc;
        }
        .med-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
            vertical-align: top;
        }
        .med-table tr:nth-child(even) td {
            background-color: #fafbfd;
        }

        /* Discharge Advice List */
        .advice-list {
            margin: 4px 0 16px 0;
            padding-left: 18px;
            font-size: 10pt;
            color: #1e293b;
        }
        .advice-list li {
            margin-bottom: 6px;
            line-height: 1.4;
        }
        .advice-list strong {
            color: #0f172a;
        }

        /* Signatures */
        .signatures-container {
            margin-top: 36px;
            padding-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #e2e8f0;
        }
        .sig-box {
            text-align: center;
            width: 40%;
        }
        .sig-line {
            border-top: 1px solid #0f172a;
            margin-bottom: 4px;
            width: 100%;
        }
        .sig-role {
            font-weight: 700;
            font-size: 10pt;
            color: #0f172a;
        }
    </style>
</head>
<body>
    <!-- ================= PAGE 1 ================= -->
    <div class="page">
        <div class="page-body">
            <!-- Hospital Main Header (Matches Appointment Pages) -->
            ${renderHeader(options?.headerHtml)}

            <div class="doc-title">DISCHARGE SUMMARY</div>

            <!-- 1. Patient Details -->
            <div class="section-title">1. Patient Details</div>
            <table class="details-table">
                <tr>
                    <td class="label">Patient Name</td>
                    <td class="value-line">${patientName}</td>
                </tr>
                <tr>
                    <td class="label">Age / Sex</td>
                    <td class="value-line">${ageSexDisplay}</td>
                </tr>
                <tr>
                    <td class="label">IP No. / UHID</td>
                    <td class="value-line">${ipUhidDisplay}</td>
                </tr>
                <tr>
                    <td class="label">Date of Admission</td>
                    <td class="value-line">${admissionDateStr || '__________'}</td>
                </tr>
                <tr>
                    <td class="label">Date of Discharge</td>
                    <td class="value-line">${dischargeDateStr || '__________'}</td>
                </tr>
                <tr>
                    <td class="label">Consultant Doctor</td>
                    <td class="value-line">${consultantDoctorName}</td>
                </tr>
                <tr>
                    <td class="label">Ward / Bed No.</td>
                    <td class="value-line">${wardBedDisplay}</td>
                </tr>
            </table>

            <!-- 2. Clinical Summary -->
            <div class="section-title">2. Clinical Summary</div>
            
            <div class="field-group">
                <div class="field-label">Chief Complaints:</div>
                <div class="field-value">${chiefComplaints || '____________________________________________________________________'}</div>
            </div>

            <div class="field-group">
                <div class="field-label">History of Present Illness:</div>
                <div class="field-value">${historyOfPresentIllness || '____________________________________________________________________'}</div>
            </div>

            <div class="field-group">
                <div class="field-label">Past Medical / Surgical History:</div>
                <div class="field-value">${pastMedicalHistory || '____________________________________________________________________'}</div>
            </div>

            <div class="field-group">
                <div class="field-label">Examination Findings at Admission:</div>
                <div class="field-value">${examinationFindings || '____________________________________________________________________'}</div>
            </div>

            <!-- 3. Diagnosis and Investigations -->
            <div class="section-title">3. Diagnosis and Investigations</div>
            
            <div class="field-group">
                <div class="field-label">Provisional Diagnosis:</div>
                <div class="field-value">${provisionalDiagnosis || '____________________________________________________________________'}</div>
            </div>

            <div class="field-group">
                <div class="field-label">Final Diagnosis:</div>
                <div class="field-value">${finalDiagnosis || '____________________________________________________________________'}</div>
            </div>
        </div>
    </div>

    <!-- ================= PAGE 2 ================= -->
    <div class="page page-break">
        <div class="page-body">
            <div class="field-group" style="margin-top: 6px;">
                <div class="field-label">Investigations:</div>
                <div class="field-value">${investigations || '____________________________________________________________________'}</div>
            </div>

            <!-- 4. Treatment and Hospital Course -->
            <div class="section-title">4. Treatment and Hospital Course</div>
            <p class="helper-text">Mention relevant medications, procedures or surgery, clinical progress, and response to treatment.</p>
            <div class="field-value" style="margin-bottom: 12px;">
                ${treatmentAndCourse || '____________________________________________________________________'}
            </div>

            <!-- 5. Condition at Discharge -->
            <div class="section-title">5. Condition at Discharge</div>
            <div class="field-value" style="margin-bottom: 12px;">
                ${conditionAtDischarge || '____________________________________________________________________'}
            </div>

            <!-- 6. Discharge Medications -->
            <div class="section-title">6. Discharge Medications</div>
            <table class="med-table">
                <thead>
                    <tr>
                        <th style="width: 7%;">S. No.</th>
                        <th style="width: 35%;">Medicine</th>
                        <th style="width: 16%;">Dose</th>
                        <th style="width: 20%;">Frequency</th>
                        <th style="width: 10%;">Qty</th>
                        <th style="width: 12%;">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${meds.length > 0 ? meds.map((m, idx) => `
                    <tr>
                        <td style="font-weight: 700;">${idx + 1}</td>
                        <td style="font-weight: 600;">${m.medicineName || '__________'}</td>
                        <td>${m.dose || '______'}</td>
                        <td>${m.frequency || '______'}</td>
                        <td style="font-weight: 600;">${m.quantity || '______'}</td>
                        <td>${m.duration || '______'}</td>
                    </tr>
                    `).join('') : `
                    <tr><td>1</td><td>__________</td><td>______</td><td>______</td><td>______</td><td>______</td></tr>
                    <tr><td>2</td><td>__________</td><td>______</td><td>______</td><td>______</td><td>______</td></tr>
                    <tr><td>3</td><td>__________</td><td>______</td><td>______</td><td>______</td><td>______</td></tr>
                    `}
                </tbody>
            </table>

            <!-- 7. Discharge Advice -->
            <div class="section-title">7. Discharge Advice</div>
            <ul class="advice-list">
                <li><strong>Diet and activity advice:</strong> ${dietAdvice}</li>
                <li><strong>Wound care / precautions, if applicable:</strong> ${woundCare}</li>
                <li><strong>Follow-up date:</strong> ${followUpDateStr}</li>
                <li><strong>Return immediately if warning symptoms occur.</strong> (High fever, severe pain, vomiting, or breathing difficulty)</li>
            </ul>

            <!-- 8. Signatures -->
            <div class="section-title" style="margin-top: 14px;">8. Signatures</div>
            <div class="signatures-container">
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-role">Consultant Doctor</div>
                    <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">${consultantDoctorName}</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-role">Patient / Attendant</div>
                    <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Signature / Thumb Impression</div>
                </div>
            </div>
        </div>

        <!-- Hospital Main Footer (Matches Appointment Pages) -->
        ${renderFooter(options?.footerHtml)}
    </div>
</body>
</html>
    `;
};
