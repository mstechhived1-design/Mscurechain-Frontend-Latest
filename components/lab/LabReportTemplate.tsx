import React, { forwardRef } from 'react';
import { LabSample } from '@/lib/integrations/types/labSample';
import HeaderPrint from './HeaderPrint';


interface LabReportTemplateProps {
    sample: LabSample;
    labInfo?: {
        name: string;
        tagline: string;
        address: string;
        phone: string;
        email: string;
        logo?: string;
    };
}

const LabReportTemplate = forwardRef<HTMLDivElement, LabReportTemplateProps>(
    ({ sample, labInfo }, ref) => {
        const defaultLabInfo = {
            name: labInfo?.name || 'MS CURE CHAIN',
            tagline: labInfo?.tagline || 'Advanced Diagnostic Laboratory',
            address: labInfo?.address || '123 Medical Plaza, Healthcare District',
            phone: labInfo?.phone || '+91 98765 43210',
            email: labInfo?.email || 'lab@mscurechain.com',
            logo: labInfo?.logo,
        };

        const formatDate = (dateString?: string) => {
            if (!dateString) return new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
            const d = new Date(dateString);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const formatTime = (dateString?: string) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return String(dateString);
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };

        const hasTestResults = (test: any) => {
            if (test.resultParameters?.length > 0) {
                const ok = test.subTests?.some((st: any) =>
                    st.result !== undefined && st.result !== null && st.result !== ''
                );
                if (ok) return true;
            }
            if (test.subTests?.some((st: any) =>
                st.result !== undefined && st.result !== null && st.result !== ''
            )) return true;
            const r = test.result || test.resultValue;
            return r && r.toString().trim() !== '';
        };

        const getDisplayRangeObj = (test: any, sampleData: LabSample) => {
            if (!test.normalRanges) return null;
            const { age, gender } = sampleData.patientDetails;
            const ranges = test.normalRanges;
            let range;
            if (age === 0) { range = ranges.newborn || ranges.infant; }
            else if (age < 1) { range = ranges.infant; }
            else if (age < 12) { range = ranges.child; }
            else if (age > 60) { range = ranges.geriatric; }
            else if (gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'm') { range = ranges.male; }
            else { range = ranges.female; }
            
            if (!range) { range = (gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'm') ? ranges.male : ranges.female; }
            return range || null;
        };

        const getDisplayRangeText = (test: any, sampleData: LabSample, defaultRange?: string) => {
            const range = getDisplayRangeObj(test, sampleData);
            if (range) {
                if (range.text) return range.text;
                if (range.min !== undefined || range.max !== undefined) {
                    return `${range.min || ''} - ${range.max || ''}`;
                }
            }
            return defaultRange || test.normalRange || '';
        };

        const getResultFlag = (result: string, rangeObj: any, isAbnormal: boolean, rangeText?: string) => {
            if (!result) return '';
            const cleanStr = String(result).replace(/,/g, '').trim();
            const val = parseFloat(cleanStr);

            if (!isNaN(val)) {
                if (rangeObj && (rangeObj.min !== undefined || rangeObj.max !== undefined)) {
                    if (rangeObj.min !== undefined && val < parseFloat(String(rangeObj.min).replace(/,/g, ''))) return '(L) ';
                    if (rangeObj.max !== undefined && val > parseFloat(String(rangeObj.max).replace(/,/g, ''))) return '(H) ';
                }

                if (rangeText && rangeText !== 'N/A' && rangeText !== '-' && rangeText !== '') {
                    const cleanRange = String(rangeText).replace(/,/g, '').trim();
                    const rangeMatch = cleanRange.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(-?\d+(?:\.\d+)?)$/i);
                    if (rangeMatch) {
                        const minVal = parseFloat(rangeMatch[1]);
                        const maxVal = parseFloat(rangeMatch[2]);
                        if (!isNaN(minVal) && val < minVal) return '(L) ';
                        if (!isNaN(maxVal) && val > maxVal) return '(H) ';
                    } else if (cleanRange.startsWith('<')) {
                        const maxVal = parseFloat(cleanRange.substring(1).trim());
                        if (!isNaN(maxVal) && val >= maxVal) return '(H) ';
                    } else if (cleanRange.startsWith('>')) {
                        const minVal = parseFloat(cleanRange.substring(1).trim());
                        if (!isNaN(minVal) && val <= minVal) return '(L) ';
                    }
                }
            }
            if (isAbnormal) return '(B) ';
            return '';
        };

        return (
            <div ref={ref} style={{ padding: 0, background: '#fff', fontFamily: '"Segoe UI", Arial, sans-serif' }}>
                <style>{`
                    .print-content {
                        display: block;
                        width: 100%;
                        max-width: 210mm;
                        margin: 0 auto;
                        position: relative;
                        background: #ffffff;
                        color: #000;
                    }
                    @media (min-width: 800px) {
                        .report-body   { padding: 20px !important; }
                        .lab-patient-grid {
                            font-size: 13px !important;
                        }
                        .lab-test-table { font-size: 13px !important; }
                        .lab-test-table th,
                        .lab-test-table td { padding: 8px 10px !important; }
                    }
                    .report-body {
                        display: block;
                        padding: 12px;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .lab-print-footer {
                        display: block;
                        position: relative;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .lab-patient-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin: 15px 0;
                        font-size: 12px;
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 4px;
                    }
                    .info-row {
                        display: grid;
                        grid-template-columns: 120px 10px 1fr;
                        margin-bottom: 4px;
                    }
                    .info-label {
                        font-weight: 600;
                        color: #333;
                    }
                    .lab-test-title {
                        text-align: center;
                        margin: 15px 0;
                        color: #333;
                    }
                    .lab-test-dept {
                        font-size: 15px;
                        font-weight: bold;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }
                    .lab-test-name {
                        font-size: 14px;
                        text-transform: uppercase;
                    }
                    .lab-test-table {
                        font-size: 12px;
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    .lab-test-table th,
                    .lab-test-table td {
                        padding: 6px 8px;
                        border: none;
                        border-bottom: none;
                        text-align: left;
                        vertical-align: top;
                        word-wrap: break-word;
                    }
                    .lab-test-table th {
                        font-weight: 700;
                        color: #000;
                        border-bottom: 2px solid #000;
                        text-transform: capitalize;
                    }
                    .lab-test-table td.abnormal-result {
                        font-weight: 900 !important;
                        color: #dc2626 !important;
                    }
                    @media print {
                        @page {
                            size: auto;
                            margin: 8mm;
                        }
                        .lab-test-table td.abnormal-result {
                            font-weight: 900 !important;
                            color: #dc2626 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .lab-report-template, .print-content, .report-body {
                            position: static !important;
                            display: block !important;
                            border: none !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            overflow: visible !important;
                            transform: none !important;
                        }
                        table.lab-master-print-table {
                            display: table !important;
                            width: 100% !important;
                            border-collapse: collapse !important;
                            border: none !important;
                            margin: 0 !important;
                        }
                        table.lab-master-print-table > thead {
                            display: table-header-group !important;
                        }
                        table.lab-master-print-table > tbody {
                            display: table-row-group !important;
                        }
                        table.lab-master-print-table > tfoot {
                            display: table-footer-group !important;
                        }
                        table.lab-master-print-table > thead > tr {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                        table.lab-master-print-table > thead > tr > td,
                        table.lab-master-print-table > thead > tr > th,
                        table.lab-master-print-table > tbody > tr > td,
                        table.lab-master-print-table > tbody > tr > th,
                        table.lab-master-print-table > tfoot > tr > td,
                        table.lab-master-print-table > tfoot > tr > th {
                            border: none !important;
                            padding: 0 !important;
                            position: static !important;
                        }
                        table.lab-master-print-table > thead * {
                            position: static !important;
                            z-index: auto !important;
                            transform: none !important;
                            box-shadow: none !important;
                        }
                        .lab-patient-grid {
                            display: table !important;
                            width: 100% !important;
                            table-layout: fixed !important;
                            margin: 15px 0 !important;
                        }
                        .lab-patient-grid > div {
                            display: table-cell !important;
                            width: 50% !important;
                            vertical-align: top !important;
                        }
                        .test-section {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                        }
                        .lab-test-table tr {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                        .lab-test-title {
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                        }
                    }
                    .test-section { margin-bottom: 24px; }
                `}</style>

                <div className="print-content">
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-35deg)',
                        fontSize: '40px',
                        color: 'rgba(0,0,0,0.04)',
                        fontWeight: 700,
                        letterSpacing: '4px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 0,
                        userSelect: 'none',
                    }}>
                        {defaultLabInfo.name}
                    </div>

                    <div className="report-body">
                        <table className="lab-master-print-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                            <thead>
                                <tr>
                                    <td colSpan={4} style={{ border: 'none', padding: 0 }}>
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <HeaderPrint />
                                        </div>

                                        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '10px 0', fontSize: '14px' }}>
                                            TEST REPORT
                                        </div>

                                        <div className="lab-patient-grid" style={{ position: 'relative', zIndex: 1 }}>
                                            <div>
                                                <div className="info-row"><span className="info-label">Reg No</span><span>:</span><span>{sample.sampleId}</span></div>
                                                <div className="info-row"><span className="info-label">Patient Name</span><span>:</span><span>{sample.patientDetails.name?.toUpperCase()}</span></div>
                                                <div className="info-row"><span className="info-label">Age</span><span>:</span><span>{String(sample.patientDetails.age || '').match(/(Y|Mos|Days|Month|Day|Yr|Yrs|Months|Years)$/i) ? sample.patientDetails.age : `${sample.patientDetails.age || 'N/A'} Y`}</span></div>
                                                <div className="info-row"><span className="info-label">Gender</span><span>:</span><span>{sample.patientDetails.gender?.charAt(0).toUpperCase()}</span></div>
                                                <div className="info-row"><span className="info-label">Ref By</span><span>:</span><span>{sample.patientDetails.refDoctor || sample.referredBy || ''}</span></div>
                                                <div className="info-row"><span className="info-label">Ref By Client</span><span>:</span><span>_</span></div>
                                            </div>
                                            <div>
                                                <div className="info-row"><span className="info-label">Reg On</span><span>:</span><span>{formatDate(sample.createdAt)} {formatTime(sample.createdAt)}</span></div>
                                                <div className="info-row"><span className="info-label">Sample Drawn On</span><span>:</span><span>{formatDate(sample.collectionDate)} {formatTime(sample.collectionDate)}</span></div>
                                                <div className="info-row"><span className="info-label">Reported On</span><span>:</span><span>{formatDate(sample.reportDate)} {formatTime(sample.reportDate)}</span></div>
                                                <div className="info-row"><span className="info-label">Sample Type</span><span>:</span><span>{sample.sampleType || 'blood'}</span></div>
                                                <div className="info-row"><span className="info-label">Report Status</span><span>:</span><span>{sample.status === 'Completed' ? 'Final' : sample.status}</span></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #1e293b' }}>
                                    <th style={{ width: '35%', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>Parameter</th>
                                    <th style={{ width: '25%', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>Result</th>
                                    <th style={{ width: '15%', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>Units</th>
                                    <th style={{ width: '25%', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>Reference Range</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sample.tests.map((test, testIdx) => {
                                    if (!hasTestResults(test)) return null;

                                    const validParams = (test.resultParameters ?? []).filter((param: any) => {
                                        const sub = test.subTests?.find((st: any) =>
                                            st.name === param.label || st.name === param.key
                                        );
                                        return sub && sub.result !== undefined && sub.result !== null && sub.result !== '';
                                    });

                                    const adhocSubTests = !validParams.length && test.subTests
                                        ? test.subTests.filter((st: any) =>
                                            st.result !== undefined && st.result !== null && st.result !== ''
                                        )
                                        : [];

                                    const mainRes = (test as any).result || test.resultValue;
                                    const hasMainResult =
                                        !validParams.length && !adhocSubTests.length &&
                                        mainRes && mainRes.toString().trim() !== '';

                                    return (
                                        <React.Fragment key={testIdx}>
                                            <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                <td colSpan={4} style={{ padding: '16px 10px 12px', textAlign: 'center' }}>
                                                    <div style={{ 
                                                        display: 'inline-block', 
                                                        fontWeight: 'bold', 
                                                        fontSize: '15px', 
                                                        color: '#1e293b',
                                                        borderBottom: '2px solid #3b82f6',
                                                        paddingBottom: '4px',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {test.testName}
                                                    </div>
                                                </td>
                                            </tr>

                                            {validParams.map((param: any, idx: number) => {
                                                const sub = test.subTests?.find(
                                                    st => st.name === param.label || st.name === param.key
                                                );
                                                if (!sub) return null;
                                                const rangeObj = getDisplayRangeObj(sub, sample);
                                                const rangeText = getDisplayRangeText(sub, sample, sub.range || param.range);
                                                const isAbnormal = test.isAbnormal || (sub as any).isAbnormal || String(sub.result || '').includes('(L)') || String(sub.result || '').includes('(H)'); 
                                                const flag = getResultFlag(sub.result as string, rangeObj, isAbnormal, rangeText);
                                                const isHighlight = flag !== '' || isAbnormal;
                                                
                                                return (
                                                    <tr key={`p-${idx}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '6px 10px', textTransform: 'uppercase' }}>{param.label}</td>
                                                        <td className={isHighlight ? 'abnormal-result' : ''} style={{ padding: '6px 10px', fontWeight: isHighlight ? 900 : 'normal', color: isHighlight ? '#dc2626' : 'inherit' }}>
                                                            {flag}{sub.result}
                                                        </td>
                                                        <td style={{ padding: '6px 10px' }}>{sub.unit || param.unit || '-'}</td>
                                                        <td style={{ padding: '6px 10px' }}>{rangeText}</td>
                                                    </tr>
                                                );
                                            })}
                                            {!validParams.length && adhocSubTests.map((st: any, idx: number) => {
                                                const rangeObj = getDisplayRangeObj(st, sample);
                                                const rangeText = getDisplayRangeText(st, sample, st.range);
                                                const isAbnormal = test.isAbnormal || (st as any).isAbnormal || String(st.result || '').includes('(L)') || String(st.result || '').includes('(H)'); 
                                                const flag = getResultFlag(st.result as string, rangeObj, isAbnormal, rangeText);
                                                const isHighlight = flag !== '' || isAbnormal;
                                                return (
                                                    <tr key={`a-${idx}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '6px 10px', textTransform: 'uppercase' }}>{st.name}</td>
                                                        <td className={isHighlight ? 'abnormal-result' : ''} style={{ padding: '6px 10px', fontWeight: isHighlight ? 900 : 'normal', color: isHighlight ? '#dc2626' : 'inherit' }}>
                                                            {flag}{st.result}
                                                        </td>
                                                        <td style={{ padding: '6px 10px' }}>{st.unit || '-'}</td>
                                                        <td style={{ padding: '6px 10px' }}>{rangeText}</td>
                                                    </tr>
                                                );
                                            })}
                                            {!validParams.length && !adhocSubTests.length && hasMainResult && (() => {
                                                const res = (test as any).result || test.resultValue;
                                                const rangeObj = getDisplayRangeObj(test, sample);
                                                const rangeText = getDisplayRangeText(test, sample, test.normalRange);
                                                const isAbnormal = test.isAbnormal || String(res || '').includes('(L)') || String(res || '').includes('(H)'); 
                                                const flag = getResultFlag(res, rangeObj, isAbnormal, rangeText);
                                                const isHighlight = flag !== '' || isAbnormal;
                                                return (
                                                    <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid', borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '6px 10px', textTransform: 'uppercase' }}>{test.testName}</td>
                                                        <td className={isHighlight ? 'abnormal-result' : ''} style={{ padding: '6px 10px', fontWeight: isHighlight ? 900 : 'normal', color: isHighlight ? '#dc2626' : 'inherit' }}>
                                                            {flag}{res}
                                                        </td>
                                                        <td style={{ padding: '6px 10px' }}>{test.unit || '-'}</td>
                                                        <td style={{ padding: '6px 10px' }}>{rangeText}</td>
                                                    </tr>
                                                );
                                            })()}
                                            {test.remarks && (
                                                <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                    <td colSpan={4} style={{ padding: '4px 10px 14px', fontSize: '13px', color: '#555' }}>
                                                        <strong>Remarks:</strong> {test.remarks}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4} style={{ border: 'none', padding: 0 }}>
                                        <div 
                                            className="lab-signature-container"
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                alignItems: 'center',
                                                marginTop: '40px',
                                                marginBottom: '15px',
                                                paddingRight: '15px',
                                                pageBreakInside: 'avoid',
                                                breakInside: 'avoid',
                                            }}
                                        >
                                            <div style={{ textAlign: 'center', minWidth: '200px' }}>
                                                {/* Blank space for signing after print */}
                                                <div style={{ height: '45px' }}></div>
                                                <div style={{ 
                                                    borderTop: '1.5px solid #000', 
                                                    paddingTop: '5px', 
                                                    fontWeight: 'bold', 
                                                    fontSize: '12px', 
                                                    color: '#1e293b',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    Lab Incharge Signature
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    (Lab Technician / Incharge)
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
);

LabReportTemplate.displayName = 'LabReportTemplate';

export default LabReportTemplate;
