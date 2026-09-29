import { format } from 'date-fns';
import { formatDoctorName } from '@/lib/utils/name-utils';

export const generatePatientHourlyRecordHtml = (data: any, options?: { printWithHeader?: boolean; printWithFooter?: boolean }) => {
    const { admission, vitals, meds, diet, labOrders, hospital } = data;
    const printWithHeader = options?.printWithHeader ?? true;
    const printWithFooter = options?.printWithFooter ?? true;

    // Sort logs by timestamp ascending for chronological report
    const sortedVitals = [...vitals].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedMeds = [...meds].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedDiet = [...(diet || [])].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Patient Hourly Monitoring Record - ${admission.patientName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', -apple-system, sans-serif; 
                    background-color: #f1f5f9; 
                    color: #1e293b; 
                    padding: 10px;
                    line-height: 1.4;
                    font-size: 11px;
                }
                
                .main-record {
                    background-color: white;
                    max-width: 850px;
                    margin: 0 auto;
                    padding: 15px; 
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    min-height: 297mm;
                    display: flex;
                    flex-direction: column;
                }

                .content-area-padding {
                    padding: 0;
                    flex: 1;
                }
                
                @media (min-width: 640px) {
                    body { padding: 20px; }
                    .main-record { padding: 25px 35px; }
                }
                
                @page {
                    size: A4;
                    margin: 0;
                }

                ${!printWithHeader ? '.standard-header { display: none !important; }' : ''}
                ${!printWithFooter ? '.standard-footer { display: none !important; }' : ''}

                /* --- Standardized Header Styles --- */
                .standard-header {
                    width: 100%;
                    background-color: #ffffff;
                    margin-bottom: 20px;
                    padding: 0;
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .header-flex {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 10px 0;
                }
                .logo-section {
                    flex: 0 0 auto;
                    padding-right: 15px;
                }
                .logo-img {
                    max-width: 100px;
                    max-height: 70px;
                    object-fit: contain;
                }
                @media (min-width: 640px) {
                    .logo-img {
                        max-width: 160px;
                        max-height: 110px;
                    }
                }
                .logo-placeholder {
                    width: 80px;
                    height: 80px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #e2e8f0;
                    font-size: 10px;
                }
                .header-divider {
                    width: 1px;
                    height: 80px;
                    background-color: #e2e8f0;
                    margin: 0 20px;
                }
                .header-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .hospital-name {
                    margin: 0;
                    font-weight: 800;
                    color: #1e40af;
                    line-height: 1.1;
                    font-size: 16px;
                    text-transform: uppercase;
                }
                @media (min-width: 640px) {
                    .hospital-name {
                        font-size: 24px;
                    }
                }
                .header-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 11px;
                    color: #334155;
                    font-weight: 700;
                }
                .header-email { color: #1e40af; }
                .header-phone { color: #22c55e; }
                .header-bottom-line {
                    width: 100%;
                    height: 4px;
                    background-color: #22c55e;
                    margin-top: 5px;
                }

                /* --- Standardized Footer Styles --- */
                .standard-footer {
                    width: 100%;
                    margin-top: 30px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .footer-slants {
                    display: flex;
                    height: 35px;
                    margin-bottom: 12px;
                    position: relative;
                }
                .slant-phone {
                    flex: 1;
                    background: #22c55e;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    padding: 0 15px;
                    font-weight: 800;
                    font-size: 10px;
                    clip-path: polygon(0 0, 100% 0, 90% 100%, 0 100%);
                    z-index: 2;
                }
                .slant-email {
                    flex: 1;
                    background: #3b82f6;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 10px;
                    clip-path: polygon(10% 0, 100% 0, 100% 100%, 0 100%);
                    margin-left: -20px;
                    z-index: 1;
                    padding-left: 20px;
                }
                @media (min-width: 640px) {
                    .slant-phone { padding: 0 30px; font-size: 12px; }
                    .slant-email { font-size: 12px; margin-left: -30px; padding-left: 30px; }
                }
                .footer-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-top: 10px;
                    gap: 15px;
                }
                .footer-disclaimers {
                    flex: 1.5;
                    list-style: none;
                    font-size: 9px;
                    color: #000000;
                    font-weight: 700;
                    line-height: 1.4;
                }
                .footer-address {
                    flex: 1.2;
                    text-align: right;
                    font-size: 9px;
                    font-weight: 800;
                    color: #000000;
                    text-transform: uppercase;
                    line-height: 1.3;
                    max-width: 250px;
                }
                .footer-bottom-note {
                    text-align: center;
                    font-size: 9px;
                    color: #000000;
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #f1f5f9;
                    font-weight: 500;
                }

                /* Report Title matching Excel */
                .report-title-container {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .report-main-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #002060; /* Dark Blue from Excel */
                    text-transform: uppercase;
                }
                .report-sub-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #000000;
                    margin-top: 4px;
                }
                .report-generated {
                    font-size: 10px;
                    font-style: italic;
                    color: #555555;
                    margin-top: 2px;
                }

                .patient-info-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0;
                    margin-bottom: 20px;
                    border: 1px solid #cbd5e1;
                }

                @media (min-width: 640px) {
                    .patient-info-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                .info-row {
                    display: contents;
                }

                .info-cell {
                    display: flex;
                }

                .info-label {
                    width: 35%;
                    background-color: #f8fafc;
                    padding: 6px 8px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #002060;
                    border-right: 1px solid #cbd5e1;
                    border-bottom: 1px solid #cbd5e1;
                }
                .info-value { 
                    width: 65%;
                    padding: 6px 8px;
                    font-size: 10px; 
                    font-weight: 800; 
                    color: #1e293b;
                    border-right: 1px solid #cbd5e1;
                    border-bottom: 1px solid #cbd5e1;
                }
                
                /* Remove right border for the last cell in a row to avoid double borders */
                .info-cell:nth-child(even) .info-value { border-right: none; }

                .section { margin-bottom: 25px; }

                /* EXCEL STYLED HEADERS */
                .section-header-title { 
                    background-color: #002060; /* Deep Blue from Excel */
                    color: #ffffff;
                    padding: 8px 12px; 
                    font-size: 11px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    margin-bottom: 0px; /* Attach tightly to tables */
                }

                .table-container {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                table { width: 100%; border-collapse: collapse; margin-top: 0; min-width: 500px; }
                th { 
                    background-color: #002060; 
                    color: #ffffff; 
                    font-size: 10px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    padding: 6px 8px; 
                    text-align: center; 
                    border: 1px solid #ffffff;
                }
                td { 
                    padding: 6px 8px; 
                    font-size: 10px; 
                    border: 1px solid #cbd5e1; 
                    color: #334155; 
                    text-align: center;
                }
                
                /* Override table headers immediately following a section header title */
                .section-header-title + table th {
                    border-top: 1px solid white; /* Separate title from headers slightly */
                }

                .status-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-stable { background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;}
                .status-warning { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a;}
                .status-critical { background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca;}

                .diet-card {
                    padding: 12px;
                    border: 1px solid #cbd5e1;
                    margin-top: 0px;
                }
                .diet-text { font-style: italic; font-weight: 600; color: #1e293b; font-size: 10px; }

                .no-break { break-inside: avoid; }
                
                /* Hide header/footer inject buttons inside print if any accidentally render */
                .print-hidden { display: none !important; }

                @media print {
                    .btn-print, .btn-back { display: none !important; }
                    body { padding: 0; background-color: white !important; }
                    .main-record { 
                        max-width: none !important; 
                        margin: 0 !important; 
                        box-shadow: none !important;
                    }
                    .table-container { overflow: visible !important; }
                    table { min-width: 0 !important; }
                    /* Ensure background colors print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="main-record">
                <!-- Standardized Header -->
                <div class="standard-header">
                    <div class="header-flex">
                        <div class="logo-section">
                            ${hospital?.logo ? `
                                <img src="${hospital.logo}" alt="Logo" class="logo-img" />
                            ` : `
                                <div class="logo-placeholder">LOGO</div>
                            `}
                        </div>
                        <div class="header-divider"></div>
                        <div class="header-details">
                            <h1 class="hospital-name">${hospital?.name || "CureChain Hospital"}</h1>
                            
                            ${hospital?.email ? `
                                <div class="header-row header-email">
                                    <div style="width: 8px; height: 8px; background-color: #1e40af; border-radius: 1px;"></div>
                                    <span>${hospital.email}</span>
                                </div>
                            ` : ''}

                            <div class="header-row">
                                <span style="color: #64748b;">${hospital?.address || "Medical District, Healthcare City"}</span>
                                ${hospital?.phone || hospital?.contact ? `
                                    <div style="width: 1px; height: 10px; background-color: #cbd5e1;"></div>
                                    <div class="header-phone">
                                        <span>📞 ${hospital.phone || hospital.contact}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="header-bottom-line"></div>
                </div>

                <div class="content-area-padding">
                    <div class="report-title-container">
                        <div class="report-main-title">PATIENT HOURLY MONITORING SUMMARY REPORT</div>
                        <div class="report-sub-title">Clinical Observation Registry</div>
                        <div class="report-generated">Report Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                    </div>

                    <div class="patient-info-grid">
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Patient Name</div>
                                <div class="info-value">${admission.patientName}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label">Admission ID</div>
                                <div class="info-value">${admission.admissionId}</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Department</div>
                                <div class="info-value">${admission.wardName || 'ICU-D'}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label">Status</div>
                                <div class="info-value">${admission.status}</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Adm Date</div>
                                <div class="info-value">${format(new Date(admission.admissionDate), 'dd MMM yyyy, HH:mm')}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label">Length of Stay</div>
                                <div class="info-value">${Math.max(0, Math.floor((new Date().getTime() - new Date(admission.admissionDate).getTime()) / (1000 * 3600 * 24)))} Days</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell">
                                <div class="info-label">Doctor</div>
                                <div class="info-value">${admission.doctorName ? formatDoctorName(admission.doctorName) : 'N/A'}</div>
                            </div>
                            <div class="info-cell">
                                <div class="info-label" style="border-bottom: none;">Ward Details</div>
                                <div class="info-value" style="border-bottom: none;">${admission.wardName ? `${admission.wardName} / ${admission.roomName || 'N/A'}` : 'Clinical Transit'}</div>
                            </div>
                        </div>
                    </div>

                    ${admission.bedHistory && admission.bedHistory.length > 0 ? `
                    <div class="section no-break">
                        <div class="section-header-title">BED OCCUPANCY HISTORY</div>
                        <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Ward / Room</th>
                                    <th>Bed ID</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Daily Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${admission.bedHistory.map((bh: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${bh.ward}</strong> / ${bh.room}</td>
                                        <td><strong style="color: #1e40af;">${bh.bed}</strong></td>
                                        <td>${format(new Date(bh.startDate), 'dd MMM yyyy, HH:mm')}</td>
                                        <td>
                                            ${bh.endDate === 'Current' 
                                                ? '<span style="color: #059669; font-weight: 800;">ACTIVE</span>' 
                                                : format(new Date(bh.endDate), 'dd MMM yyyy, HH:mm')}
                                        </td>
                                        <td>₹${bh.rate}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    ` : ''}

                    <div class="section no-break">
                        <div class="section-header-title" style="margin-bottom: 5px;">Prescribed Diet Plan</div>
                        <div class="diet-card">
                            <p class="diet-text">"${admission.diet || 'Standard hospital nutrition prescribed.'}"</p>
                        </div>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title">HOURLY VITALS LOG</div>
                        <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Time</th>
                                    <th>Heart Rate</th>
                                    <th>BP</th>
                                    <th>SpO2</th>
                                    <th>Temp (F)</th>
                                    <th>Resp</th>
                                    <th>Nurse</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(vitals || []).length > 0 ? (vitals || []).map((v: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td>${format(new Date(v.timestamp), 'dd/MM/yyyy')}</td>
                                        <td>${format(new Date(v.timestamp), 'EEEE')}</td>
                                        <td><strong>${format(new Date(v.timestamp), 'HH:mm')}</strong></td>
                                        <td>${v.heartRate} bpm</td>
                                        <td>${v.systolicBP}/${v.diastolicBP}</td>
                                        <td>${v.spO2}%</td>
                                        <td>${v.temperature}°F</td>
                                        <td>${v.respiratoryRate || '--'}</td>
                                        <td>${v.recordedBy?.name}</td>
                                        <td>
                                            <span class="status-badge status-${v.status?.toLowerCase() || 'stable'}">
                                                ${v.status || 'Stable'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">No vital signs recorded yet.</td></tr>'}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title">MEDICATION ADMINISTRATION LOG</div>
                        <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Drug Name</th>
                                    <th>Route</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Slot</th>
                                    <th>Admin Nurse</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(meds || []).length > 0 ? (meds || []).map((m: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${m.drugName}</strong></td>
                                        <td>${m.route || '-'}</td>
                                        <td>${format(new Date(m.timestamp), 'dd/MM/yyyy')}</td>
                                        <td><strong>${format(new Date(m.timestamp), 'HH:mm')}</strong></td>
                                        <td>${m.timeSlot}</td>
                                        <td>${m.administeredBy?.name}</td>
                                        <td>${m.status}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No medications administered during this period.</td></tr>'}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    <div class="section no-break">
                        <div class="section-header-title">DIETARY INTAKE LOG</div>
                        <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Items</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Nurse</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(diet || []).length > 0 ? (diet || []).map((d: any, idx: number) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td style="text-align: left;">
                                            <strong>
                                                ${d.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', ')}
                                            </strong>
                                        </td>
                                        <td>${d.category}</td>
                                        <td>${format(new Date(d.timestamp), 'dd/MM/yyyy')}</td>
                                        <td><strong>${d.recordedTime}</strong></td>
                                        <td>${d.recordedBy?.name}</td>
                                        <td style="text-align: left;">${d.notes || '-'}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No dietary intake recorded.</td></tr>'}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    ${(labOrders || []).length > 0 ? `
                    <div class="section no-break">
                        <div class="section-header-title">LAB INVESTIGATIONS REGISTRY</div>
                        <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Date</th>
                                    <th>Test Name</th>
                                    <th>Status</th>
                                    <th>Result</th>
                                    <th>Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                let html = '';
                let labRowCounter = 1;
                (labOrders || []).forEach((order: any) => {
                    const date = format(new Date(order.createdAt), 'dd MMMM yyyy HH:mm');
                    order.tests?.forEach((test: any) => {
                        const testName = test.testName || test.test?.testName || 'Test';

                        if (test.subTests && test.subTests.length > 0) {
                            test.subTests.forEach((st: any) => {
                                const hasResult = st.result !== undefined && st.result !== null && st.result !== '';
                                html += `
                                    <tr>
                                        <td>${labRowCounter++}</td>
                                        <td>${date}</td>
                                        <td style="text-align: left;">${testName} - ${st.name}</td>
                                        <td ${!hasResult ? 'style="color: #94a3b8; font-style: italic;"' : ''}>${order.status || (hasResult ? 'Completed' : 'Pending')}</td>
                                        <td><strong>${hasResult ? st.result : '-'}</strong></td>
                                        <td>${st.unit || '-'}</td>
                                    </tr>
                                `;
                            });
                        } else {
                            const hasResult = test.resultValue !== undefined && test.resultValue !== null && test.resultValue !== '';
                            html += `
                                    <tr>
                                        <td>${labRowCounter++}</td>
                                        <td>${date}</td>
                                        <td style="text-align: left;">${testName}</td>
                                        <td ${!hasResult ? 'style="color: #94a3b8; font-style: italic;"' : ''}>${order.status || (hasResult ? 'Completed' : 'Pending')}</td>
                                        <td><strong>${hasResult ? test.resultValue : '-'}</td>
                                        <td>${test.unit || '-'}</td>
                                    </tr>
                                `;
                        }
                    });
                });
                return html;
            })()}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Standardized Footer -->
                <div class="standard-footer" style="margin-top: auto;">
                    <div class="footer-slants">
                        ${hospital?.phone || hospital?.contact ? `
                            <div class="slant-phone">
                                <span style="margin-right: 8px;">📞</span>
                                ${hospital.phone || hospital.contact}
                            </div>
                        ` : ''}

                        ${hospital?.email ? `
                            <div class="slant-email">
                                <span style="margin-right: 8px;">✉️</span>
                                ${hospital.email}
                            </div>
                        ` : ''}
                    </div>

                    <div class="footer-info">
                        <div class="footer-disclaimers">
                            <ul style="margin: 0; padding: 0; list-style: none;">
                                <li>• All results should be co-related clinically</li>
                                <li>• If results are alarming or unexpected, contact the Helpdesk immediately</li>
                                <li>• Not valid for medico-legal purposes</li>
                                <li>• The test with an asterisk(*) are not accredited by NABL</li>
                            </ul>
                        </div>

                        <div class="footer-address">
                            ${hospital?.address || "Medical District, Healthcare City"}
                        </div>
                    </div>

                    <div class="footer-bottom-note">
                        This is a computer generated document and does not require a physical signature.
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};
