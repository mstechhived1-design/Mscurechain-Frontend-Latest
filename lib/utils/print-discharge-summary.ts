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
    dischargeData?: DischargeSummaryData
): string => {
    // 1. Dynamic Hospital Header Fallbacks
    const hospName = hospital?.name || 'DHRUVA MULTISPECIALITY HOSPITAL';
    const hospAddress = hospital?.address || 'Door No. 1/705, Dwaraka Nagar, Beside Raithu Bazar, Sandhya Circle, Kadapa';
    const hospContact = hospital?.phone || hospital?.mobile || '9959959694';

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

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Discharge Summary - ${patientName}</title>
    <style>
        @page {
            size: A4;
            margin: 10mm 14mm 10mm 14mm;
            @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
            }
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
            font-size: 11pt;
            line-height: 1.45;
        }
        .page {
            padding: 4mm 2mm;
            width: 100%;
        }
        .page-break {
            page-break-before: always;
            break-before: page;
            clear: both;
            margin-top: 20px;
        }

        /* Hospital Header */
        .hospital-header {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 6px;
        }
        .hospital-name {
            font-size: 17pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0 0 3px 0;
            color: #0f172a;
        }
        .hospital-meta {
            font-size: 9.5pt;
            color: #334155;
            margin: 0 0 2px 0;
            font-weight: 500;
        }
        .hospital-divider {
            border: none;
            border-top: 1px solid #cbd5e1;
            margin: 8px 0 10px 0;
        }

        /* Title */
        .doc-title {
            text-align: center;
            font-size: 13pt;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 14px 0;
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
        <!-- Hospital Header -->
        <div class="hospital-header">
            <h1 class="hospital-name">${hospName}</h1>
            <p class="hospital-meta">${hospAddress}</p>
            <p class="hospital-meta">Contact: ${hospContact}</p>
        </div>

        <hr class="hospital-divider" />

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

    <!-- ================= PAGE 2 ================= -->
    <div class="page page-break">
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
</body>
</html>
    `;
};
