import { format } from 'date-fns';
import { formatDoctorName } from '@/lib/utils/name-utils';

export const generateNurseHourlyRecordHtml = (data: any) => {
    const { admission, vitals, meds, diet, labOrders, hospital } = data;

    // Sort logs by timestamp ascending for chronological report
    const sortedVitals = [...vitals].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedMeds = [...meds].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sortedDiet = [...(diet || [])].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Patient Hourly Monitoring Record - ${admission.patientName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', -apple-system, sans-serif; 
                    background-color: #f1f5f9; 
                    color: #1e293b; 
                    padding: 5px;
                    line-height: 1.4;
                    font-size: 11px;
                }
                
                .main-record {
                    background-color: white;
                    width: 100%;
                    max-width: 850px;
                    margin: 0 auto;
                    padding: 15px;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    min-height: 297mm;
                }
                
                @media (min-width: 640px) {
                    body { padding: 10px; }
                    .main-record { padding: 25px 35px; }
                }

                @page {
                    size: A4;
                    margin: 0;
                }

                .header {
                    text-align: center;
                    border-bottom: 2px solid #3b82f6;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }
                .header h1 { 
                    font-size: 14px; 
                    font-weight: 800; 
                    color: #1d4ed8; 
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                @media (min-width: 640px) {
                    .header h1 { font-size: 16px; }
                }
                .header p { font-size: 9px; color: #64748b; font-weight: 600; margin-top: 2px; }

                .patient-info-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                    background-color: #f8fafc;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                @media (min-width: 480px) {
                    .patient-info-grid { grid-template-columns: 1fr 1fr; }
                }
                @media (min-width: 640px) {
                    .patient-info-grid { grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 15px; }
                }

                .info-item { display: flex; flex-direction: column; gap: 2px; }
                .info-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-value { font-size: 10px; font-weight: 600; color: #1e293b; }
                @media (min-width: 640px) {
                    .info-value { font-size: 11px; }
                }

                .section { margin-bottom: 20px; }
                @media (min-width: 640px) {
                    .section { margin-bottom: 25px; }
                }
                .section-header { 
                    background-color: #f1f5f9; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-left: 4px solid #3b82f6;
                }
                .section-header h2 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }

                .table-container {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; min-width: 400px; }
                th { 
                    background-color: #f8fafc; 
                    color: #64748b; 
                    font-size: 8px; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    padding: 6px; 
                    text-align: left; 
                    border-bottom: 1px solid #e2e8f0;
                }
                td { padding: 6px; font-size: 9px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                @media (min-width: 640px) {
                    th { font-size: 9px; padding: 8px; }
                    td { font-size: 10px; padding: 8px; }
                }
                
                .status-badge {
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-stable { background-color: #ecfdf5; color: #059669; }
                .status-warning { background-color: #fffbeb; color: #d97706; }
                .status-critical { background-color: #fef2f2; color: #dc2626; }

                .diet-card {
                    padding: 10px;
                    background-color: #f0fdf4;
                    border: 1px solid #dcfce7;
                    border-radius: 8px;
                    margin-top: 5px;
                }
                /* --- Standardized Header Styles (Matching MainHeader.tsx) --- */
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

                /* --- Standardized Footer Styles (Matching MainFooter.tsx) --- */
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

                .no-break { break-inside: avoid; }
                
                @media print {
                    body { padding: 0; background-color: white !important; }
                    .main-record { 
                        max-width: none !important; 
                        margin: 0 !important; 
                        padding: 10mm !important; 
                        box-shadow: none !important;
                    }
                    .table-container { overflow: visible !important; }
                    table { min-width: 0 !important; }
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

                <div style="text-align: center; margin-bottom: 15px;">
                    <p style="font-weight: 800; color: #1e293b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                        HOURLY MONITORING & CLINICAL LOG
                    </p>
                </div>

            <div class="patient-info-grid">
                <div class="info-item">
                    <span class="info-label">Patient Name</span>
                    <span class="info-value">${admission.patientName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Admission ID</span>
                    <span class="info-value">${admission.admissionId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Admission Date</span>
                    <span class="info-value">${format(new Date(admission.admissionDate), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Doctor</span>
                    <span class="info-value">${admission.doctorName ? formatDoctorName(admission.doctorName) : 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location</span>
                    <span class="info-value">
                        ${admission.wardName ? `
                            ${admission.wardName}
                            ${admission.roomName ? ` - ${admission.roomName}` : ''}
                            ${admission.bedName ? ` - ${admission.bedName}` : ''}
                        ` : 'Clinical Transit'}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value" style="color: #059669;">${admission.status}</span>
                </div>
            </div>
            
            ${admission.bedHistory && admission.bedHistory.length > 0 ? `
            <div class="section no-break">
                <div class="section-header">
                    <h2>Bed Assignment & Transfer History</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ward / Room</th>
                                <th>Bed ID</th>
                                <th>Assigned</th>
                                <th>Released</th>
                                <th>Daily Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${admission.bedHistory.map((bh: any) => `
                                <tr>
                                    <td><strong>${bh.ward}</strong><br/><span style="font-size: 8px;">Room: ${bh.room}</span></td>
                                    <td><strong style="color: #1e40af;">${bh.bed}</strong></td>
                                    <td>${format(new Date(bh.startDate), 'dd/MM HH:mm')}</td>
                                    <td>
                                        ${bh.endDate === 'Current' 
                                            ? '<span style="color: #059669; font-weight: 800;">ACTIVE</span>' 
                                            : format(new Date(bh.endDate), 'dd/MM HH:mm')}
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
                <div class="section-header">
                    <h2>Diet Plan</h2>
                </div>
                <div class="diet-card">
                    <p class="diet-text">"${admission.diet || 'Standard hospital nutrition prescribed.'}"</p>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>Vitals Observation Log</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>HR</th>
                                <th>BP</th>
                                <th>SpO2</th>
                                <th>Temp</th>
                                <th>Resp</th>
                                <th>Glucose</th>
                                <th>Nurse</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedVitals.length > 0 ? sortedVitals.map((v: any) => `
                                <tr>
                                    <td>
                                        <strong>${format(new Date(v.timestamp), 'HH:mm')}</strong><br/>
                                        <span style="font-size: 7px; color: #94a3b8;">${format(new Date(v.timestamp), 'dd MMM')}</span>
                                    </td>
                                    <td>${v.heartRate}</td>
                                    <td>${v.systolicBP}/${v.diastolicBP}</td>
                                    <td>${v.spO2}%</td>
                                    <td>${v.temperature}°F</td>
                                    <td>${v.respiratoryRate || '--'}</td>
                                    <td>${v.glucose || '--'}</td>
                                    <td>${v.recordedBy?.name || '--'}</td>
                                    <td>
                                        <span class="status-badge status-${v.status?.toLowerCase() || 'stable'}">
                                            ${v.status || 'Stable'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No records yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Medication Log</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Drug</th>
                                <th>Dose & Route</th>
                                <th>Time</th>
                                <th>Slot</th>
                                <th>Nurse</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedMeds.length > 0 ? sortedMeds.map((m: any) => `
                                <tr>
                                    <td><strong>${m.drugName}</strong></td>
                                    <td>${m.dose} • ${m.route}</td>
                                    <td>${format(new Date(m.timestamp), 'dd/MM HH:mm')}</td>
                                    <td>${m.timeSlot}</td>
                                    <td>${m.administeredBy?.name || '--'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No records.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section no-break">
                <div class="section-header">
                    <h2>Dietary Intake Log</h2>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Items Consumed</th>
                                <th>Category/Slot</th>
                                <th>Time Recorded</th>
                                <th>Nurse</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedDiet.length > 0 ? sortedDiet.map((d: any) => `
                                <tr>
                                    <td>
                                        <div style="display: flex; flex-direction: column; gap: 2px;">
                                            <strong style="font-size: 10px;">
                                                ${d.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', ')}
                                            </strong>
                                            ${d.items?.some((i: any) => i.calories) ? `
                                            <span style="font-size: 7px; color: #b45309; font-weight: 800; text-transform: uppercase;">
                                                Total: ${d.items.reduce((sum: number, i: any) => sum + (Number(i.calories) || 0), 0)} Kcal
                                            </span>` : ''}
                                        </div>
                                    </td>
                                    <td><span class="status-badge" style="background-color: #ffedd5; color: #ea580c;">${d.category}</span></td>
                                    <td>
                                        ${d.recordedTime}<br/>
                                        <span style="font-size: 7px; color: #94a3b8;">${format(new Date(d.timestamp), 'dd MMM (EEE)')}</span>
                                    </td>
                                    <td>${d.recordedBy?.name || '--'}</td>
                                    <td>${d.notes || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8;">No dietary intake recorded.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>Diagnostics & Investigations Detail</h2>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${labOrders.length > 0 ? labOrders.map((order: any) => `
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                                <div style="flex: 1;">
                                    <h3 style="font-size: 10px; font-weight: 800; color: #1e293b; margin-bottom: 2px; text-transform: uppercase;">
                                        ${order.tests?.map((t: any) => t.testName || t.test?.testName || 'Investigation').join(', ')}
                                    </h3>
                                    <p style="font-size: 8px; color: #64748b; font-weight: 600;">By ${admission.doctorName ? formatDoctorName(admission.doctorName) : 'Doctor'}</p>
                                </div>
                                <div style="text-align: right;">
                                    <span class="status-badge" style="background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;">${order.status}</span>
                                    <p style="font-size: 7px; color: #94a3b8; font-weight: 600; margin-top: 2px;">${format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                                </div>
                            </div>
                            
                            <table style="margin-top: 0; background: transparent; min-width: 0;">
                                <tbody>
                                    ${order.tests?.map((test: any) => {
        if (test.subTests && test.subTests.length > 0) {
            return test.subTests.map((st: any) => `
                                                <tr>
                                                    <td style="border: none; padding: 3px 0; font-size: 9px; color: #64748b;">${st.name}</td>
                                                    <td style="border: none; padding: 3px 0; text-align: right; font-weight: 800; color: #1e293b;">${st.result} <span style="font-size: 7px; color: #94a3b8; font-weight: 400;">${st.unit || ''}</span></td>
                                                </tr>
                                            `).join('');
        } else if (test.resultValue) {
            return `
                                                <tr>
                                                    <td style="border: none; padding: 3px 0; font-size: 9px; color: #64748b;">${test.testName || test.test?.testName}</td>
                                                    <td style="border: none; padding: 3px 0; text-align: right; font-weight: 800; color: #1e293b;">${test.resultValue} <span style="font-size: 7px; color: #94a3b8; font-weight: 400;">${test.unit || ''}</span></td>
                                                </tr>
                                            `;
        }
        return '';
    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('') : '<p style="text-align: center; width: 100%; color: #94a3b8; padding: 15px; border: 1px dashed #e2e8f0; border-radius: 8px; font-size: 9px;">No diagnostic investigation reports found for this admission.</p>'}
                </div>
            </div>

            <!-- Standardized Footer -->
            <div class="standard-footer">
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
