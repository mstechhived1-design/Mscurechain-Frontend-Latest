import { LabSample, SampleTestResult } from '../integrations/types/labSample';
import { formatDoctorName } from '@/lib/utils/name-utils';

export interface ReportTemplateData {
    labName: string;
    labTagline: string;
    labAddress: string;
    labPhone: string;
    labEmail: string;
    logoUrl?: string;
    patientName: string;
    patientAge: number;
    patientGender: string;
    patientId: string;
    sampleLocation: string;
    referringDoctor: string;
    reportDate: string;
    testTitle: string;
    interpretation: string;
    testResultsRows: string;
}

export class LabReportGenerator {
    private static readonly REPORT_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lab Report - {{TEST_TITLE}}</title>
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #ffffff;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report {
      position: relative;
      max-width: 800px;
      margin: auto;
      background: #ffffff;
      padding: 30px;
      border: 2px solid #000;
    }

    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 70px;
      color: rgba(0, 0, 0, 0.06);
      font-weight: 700;
      letter-spacing: 4px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }

    .header {
      display: flex;
      align-items: center;
      border-bottom: 3px solid #0a5aa8;
      padding-bottom: 15px;
    }

    .logo {
      width: 80px;
      height: 80px;
      margin-right: 15px;
    }

    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .lab-details {
      flex: 1;
    }

    .lab-name {
      font-size: 28px;
      font-weight: 700;
      color: #0a5aa8;
    }

    .lab-tagline {
      font-size: 14px;
      color: #555;
    }

    .lab-address {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .patient-info {
      display: flex;
      justify-content: space-between;
      margin: 25px 0;
      font-size: 14px;
    }

    .patient-info div {
      width: 48%;
      line-height: 1.6;
    }

    h2 {
      text-align: center;
      margin: 25px 0 15px;
      font-size: 22px;
      border-bottom: 2px solid #ddd;
      padding-bottom: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th,
    td {
      border: 1px solid #d0d0d0;
      padding: 8px 10px;
    }

    th {
      background: #f2f6fb;
      text-align: left;
      font-weight: 600;
    }

    .section {
      background: #eaf2fb;
      font-weight: bold;
    }

    .low {
      color: #1a73e8;
      font-weight: 600;
    }

    .high {
      color: #d93025;
      font-weight: 600;
    }

    .borderline {
      color: #e37400;
      font-weight: 600;
    }

    .footer {
      margin-top: 25px;
      font-size: 13px;
      line-height: 1.6;
    }

    .end {
      text-align: center;
      margin-top: 20px;
      font-weight: bold;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .report {
        border: none;
      }
    }
  </style>
</head>

<body>
  <div class="report">
    <div class="watermark">{{LAB_NAME}}</div>

    <div class="header">
      <div class="logo">
        {{LOGO_HTML}}
      </div>

      <div class="lab-details">
        <div class="lab-name">{{LAB_NAME}}</div>
        <div class="lab-tagline">{{LAB_TAGLINE}}</div>
        <div class="lab-address">
          {{LAB_ADDRESS}}<br>
          Phone: {{LAB_PHONE}} | Email: {{LAB_EMAIL}}
        </div>
      </div>
    </div>

    <div class="patient-info">
      <div>
        <strong>Patient Name:</strong> {{PATIENT_NAME}}<br>
        <strong>Age / Sex:</strong> {{PATIENT_AGE}} Years / {{PATIENT_GENDER}}<br>
        <strong>Patient ID:</strong> {{PATIENT_ID}}
      </div>
      <div>
        <strong>Sample Collected At:</strong> {{SAMPLE_LOCATION}}<br>
        <strong>Referred By:</strong> {{REFERRING_DOCTOR}}<br>
        <strong>Report Date:</strong> {{REPORT_DATE}}
      </div>
    </div>

    <h2>{{TEST_TITLE}}</h2>

    <table>
      <tr>
        <th>Investigation</th>
        <th>Result</th>
        <th>Unit</th>
        <th>Reference Range</th>
      </tr>
      {{TEST_RESULTS_ROWS}}
    </table>

    <div class="footer">
      <strong>Interpretation:</strong> {{INTERPRETATION}}
    </div>

    <div class="end">**** End of Report ****</div>
  </div>
</body>
</html>
`;

    /**
     * Generate HTML report for a lab sample
     */
    static generateReport(sample: LabSample, labInfo: {
        name: string;
        tagline: string;
        address: string;
        phone: string;
        email: string;
        logoUrl?: string;
    }): string {
        const testTitle = sample.tests.map(t => t.testName).join(', ');
        const testResultsRows = this.generateTestResultsRows(sample);
        const interpretation = this.generateInterpretation(sample);

        const logoHtml = labInfo.logoUrl
            ? `<img src="${labInfo.logoUrl}" alt="${labInfo.name}" />`
            : `<div style="width:100%;height:100%;background:#0a5aa8;color:white;display:flex;align-items:center;justify-center;font-size:32px;font-weight:bold;border-radius:8px;">${labInfo.name.charAt(0)}</div>`;

        const html = this.REPORT_TEMPLATE
            .replace(/{{LAB_NAME}}/g, labInfo.name)
            .replace(/{{LAB_TAGLINE}}/g, labInfo.tagline)
            .replace(/{{LAB_ADDRESS}}/g, labInfo.address)
            .replace(/{{LAB_PHONE}}/g, labInfo.phone)
            .replace(/{{LAB_EMAIL}}/g, labInfo.email)
            .replace(/{{LOGO_HTML}}/g, logoHtml)
            .replace(/{{PATIENT_NAME}}/g, sample.patientDetails.name)
            .replace(/{{PATIENT_AGE}}/g, sample.patientDetails.age.toString())
            .replace(/{{PATIENT_GENDER}}/g, sample.patientDetails.gender)
            .replace(/{{PATIENT_ID}}/g, sample.patientDetails.patientId || 'N/A')
            .replace(/{{SAMPLE_LOCATION}}/g, sample.sampleType || 'Lab Collection')
            .replace(/{{REFERRING_DOCTOR}}/g, sample.referredBy ? formatDoctorName(sample.referredBy) : 'Self')
            .replace(/{{REPORT_DATE}}/g, sample.reportDate ? new Date(sample.reportDate).toLocaleDateString() : new Date().toLocaleDateString())
            .replace(/{{TEST_TITLE}}/g, testTitle)
            .replace(/{{TEST_RESULTS_ROWS}}/g, testResultsRows)
            .replace(/{{INTERPRETATION}}/g, interpretation);

        return html;
    }

    /**
     * Generate table rows for test results
     */
    private static generateTestResultsRows(sample: LabSample): string {
        let rows = '';

        for (const test of sample.tests) {
            // Main test row
            if (test.resultValue) {
                const resultClass = test.isAbnormal ? 'high' : '';
                const range = this.getDisplayRange(test, sample);

                rows += `
      <tr>
        <td><strong>${test.testName}</strong></td>
        <td class="${resultClass}">${test.resultValue}</td>
        <td>${test.unit || '-'}</td>
        <td>${range}</td>
      </tr>`;
            }

            // Sub-test rows
            if (test.subTests && test.subTests.length > 0) {
                for (const subTest of test.subTests) {
                    if (subTest.name && subTest.result) {
                        rows += `
      <tr>
        <td style="padding-left: 30px;">${subTest.name}</td>
        <td>${subTest.result}</td>
        <td>${subTest.unit || '-'}</td>
        <td>${subTest.range || '-'}</td>
      </tr>`;
                    }
                }
            }

            // Remarks row if present
            if (test.remarks) {
                rows += `
      <tr>
        <td colspan="4" style="font-style: italic; color: #666;">
          <strong>Remarks:</strong> ${test.remarks}
        </td>
      </tr>`;
            }
        }

        return rows;
    }

    /**
     * Get display range for a test based on patient demographics
     */
    private static getDisplayRange(test: any, sample: LabSample): string {
        if (!test.normalRanges) return test.normalRange || 'N/A';

        const { age, gender } = sample.patientDetails;
        const ranges = test.normalRanges;

        let range;

        if (age === 0) {
            range = ranges.newborn || ranges.infant;
        } else if (age < 1) {
            range = ranges.infant;
        } else if (age < 12) {
            range = ranges.child;
        } else if (age > 60) {
            range = ranges.geriatric;
        } else if (gender?.toLowerCase() === 'male') {
            range = ranges.male;
        } else {
            range = ranges.female;
        }

        if (!range) {
            range = gender?.toLowerCase() === 'male' ? ranges.male : ranges.female;
        }

        if (range) {
            if (range.text) return range.text;
            if (range.min !== undefined || range.max !== undefined) {
                return `${range.min || ''} - ${range.max || ''}`;
            }
        }

        return test.normalRange || 'N/A';
    }

    /**
     * Generate interpretation based on abnormal results
     */
    private static generateInterpretation(sample: LabSample): string {
        const abnormalTests = sample.tests.filter(t => t.isAbnormal);

        if (abnormalTests.length === 0) {
            return 'All parameters are within normal limits.';
        }

        const abnormalNames = abnormalTests.map(t => t.testName).join(', ');
        return `Abnormal values detected in: ${abnormalNames}. Please correlate clinically and consult with your physician for further evaluation.`;
    }

    /**
     * Generate multiple reports if sample has tests from different departments
     */
    static generateReportsByDepartment(sample: LabSample, labInfo: {
        name: string;
        tagline: string;
        address: string;
        phone: string;
        email: string;
        logoUrl?: string;
    }): Map<string, string> {
        const reportsByDept = new Map<string, string>();

        // Group tests by department
        const testsByDept = new Map<string, typeof sample.tests>();

        for (const test of sample.tests) {
            const dept = test.departmentName || 'General';
            if (!testsByDept.has(dept)) {
                testsByDept.set(dept, []);
            }
            testsByDept.get(dept)!.push(test);
        }

        // Generate report for each department
        for (const [dept, tests] of testsByDept.entries()) {
            const deptSample = { ...sample, tests };
            const html = this.generateReport(deptSample, labInfo);
            reportsByDept.set(dept, html);
        }

        return reportsByDept;
    }
}
