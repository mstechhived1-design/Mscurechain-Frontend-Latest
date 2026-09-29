import React, { forwardRef } from 'react';
import { LabSample } from '@/lib/integrations/types/labSample';
import { usePrintStore } from '@/stores/printStore';
import PrintSettingsToggle from '@/components/printers/PrintSettingsToggle';

interface ResultPrintViewProps {
    sample: LabSample;
}

const ResultPrintView = forwardRef<HTMLDivElement, ResultPrintViewProps>(({ sample }, ref) => {
    // Group tests by department (Currently mock/implied or just list them. 
    // Reference image shows "HEMATOLOGY", "BIOCHEMISTRY" headers. 
    // Since we don't store Department in TestResult yet, we will just list them under a generic header or implement a mapping if possible.
    // For now, we'll assume linear list as per current data structure, or mock grouping if feasible.
    // Ideally we update backend to store department name in tests array. 
    // As a workaround, we can just render the list flat or try to infer.
    // The reference image shows "Lipid Profile" under Biochemistry.

    // Let's just list them nicely for now.
    const getDisplayRange = (test: any) => {
        if (!test.normalRanges) return test.normalRange || '-';
        const { age, gender } = sample.patientDetails;

        let range;
        if (age < 12) {
            range = test.normalRanges.child;
        } else if (gender?.toLowerCase() === 'male') {
            range = test.normalRanges.male;
        } else if (gender?.toLowerCase() === 'female') {
            range = test.normalRanges.female;
        }

        if (range && (range.min !== undefined || range.max !== undefined)) {
            return `${range.min ?? 0} - ${range.max ?? 0}`;
        }

        return test.normalRange || '-';
    };

    const { printWithHeader } = usePrintStore();

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-4xl mx-auto border border-gray-300 relative" id="printable-result">
            <PrintSettingsToggle />
            <table className="lab-master-print-table w-full border-collapse border-0">
                <thead>
                    <tr>
                        <td className="border-0 p-0">
                            {/* Header */}
                            {printWithHeader ? (
                            <div className="flex items-center justify-between mb-6 border-b-2 border-gray-800 pb-4">
                                <div className="w-24 h-24 relative flex-shrink-0">
                                    <div className="w-full h-full rounded-full border-4 border-blue-900 flex items-center justify-center text-blue-900 font-bold bg-blue-50 text-xs text-center p-1">
                                        LOGO
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-3xl font-bold text-gray-900">MediLab Laboratory</h1>
                                    <p className="text-sm text-gray-600">Contact: 7987654321</p>
                                    <p className="text-sm text-gray-600">Email: example@medilab.com</p>
                                </div>
                            </div>
                            ) : (
                                <div style={{ height: '120px', width: '100%' }}></div>
                            )}

                            {/* Patient Info Grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6 border-b border-dashed border-gray-400 pb-4">
                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Name :</span>
                                    <span>{sample.patientDetails.name}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Sample ID :</span>
                                    <span>{sample.sampleId}</span>
                                </div>

                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Age / Gender :</span>
                                    <span>{sample.patientDetails.age} Years / {sample.patientDetails.gender}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Reg. No :</span>
                                    <span>{sample.patientDetails.mobile}</span>
                                </div>

                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Referred By :</span>
                                    <span>{sample.patientDetails.refDoctor || 'Self'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Collected On :</span>
                                    <span>{sample.collectionDate ? new Date(sample.collectionDate).toLocaleString() : '-'}</span>
                                </div>

                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Ordered On :</span>
                                    <span>{sample.createdAt ? new Date(sample.createdAt).toLocaleString() : '-'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Reported On :</span>
                                    <span>{sample.reportDate ? new Date(sample.reportDate).toLocaleString() : '-'}</span>
                                </div>

                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Sample Type :</span>
                                    <span>{sample.sampleType}</span>
                                </div>

                                <div className="grid grid-cols-[100px_1fr]">
                                    <span className="font-bold">Turnaround :</span>
                                    <span>
                                        {(() => {
                                            if (!sample.collectionDate || !sample.reportDate) return '-';
                                            const diff = new Date(sample.reportDate).getTime() - new Date(sample.collectionDate).getTime();
                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                            return `${hours}h ${minutes}m`;
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold uppercase underline tracking-wider">Laboratory Report</h2>
                            </div>
                        </td>
                    </tr>
                    <tr className="border-b-2 border-gray-800 text-left bg-gray-50 text-sm">
                        <th className="py-2.5 w-1/3 px-2 font-bold">Test Name</th>
                        <th className="py-2.5 px-2 font-bold">Result</th>
                        <th className="py-2.5 px-2 font-bold">Units</th>
                        <th className="py-2.5 px-2 font-bold">Reference Range</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 text-sm">
                    {sample.tests.map((test, index) => (
                        <React.Fragment key={`${test.testName}-${index}`}>
                            <tr className="border-b border-gray-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <td className="py-3 px-2 font-bold text-gray-900 bg-gray-50/30">{test.testName}</td>
                                <td className={`py-3 px-2 font-black ${test.isAbnormal ? 'text-red-600' : ''}`}>
                                    {test.resultValue || '-'}
                                    {test.isAbnormal && <span className="text-red-600 ml-1 text-[10px] bg-red-50 border border-red-200 px-1 rounded">▲ Abnormal</span>}
                                </td>
                                <td className="py-3 px-2">{test.unit || '-'}</td>
                                <td className="py-3 px-2 text-xs">{getDisplayRange(test)}</td>
                            </tr>

                            {/* Sub Tests */}
                            {test.subTests && test.subTests.length > 0 && test.subTests.map((sub, sIndex) => (
                                <tr key={`sub-${index}-${sIndex}`} className="border-b border-gray-100 text-[13px]" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                    <td className="py-2 px-6 text-gray-600 italic font-medium">{sub.name}</td>
                                    <td className="py-2 px-2 font-semibold">{sub.result || '-'}</td>
                                    <td className="py-2 px-2">{sub.unit || '-'}</td>
                                    <td className="py-2 px-2 text-[11px] text-gray-500">{sub.range || '-'}</td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td className="border-0 p-0">
                            {/* Footer */}
                            {printWithHeader ? (
                            <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between items-end text-xs text-center">
                                <div className="text-center">
                                    <p className="font-bold mb-10">(Technician)</p>
                                </div>
                                <div className="text-center">
                                    <p className="mb-8 italic text-gray-400">Electronically verified</p>
                                    <p className="font-bold border-t border-black px-4 pt-1">Medical Lab Technologist</p>
                                </div>
                                <div className="text-center">
                                    <p className="mb-8 italic text-gray-400">Electronically verified</p>
                                    <p className="font-bold border-t border-black px-4 pt-1">Dr. Pathologist</p>
                                </div>
                            </div>
                            ) : (
                                <div style={{ height: '80px', width: '100%' }}></div>
                            )}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-result, #printable-result * {
                        visibility: visible;
                    }
                    #printable-result {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 100%;
                        margin: 0;
                        padding: 20px;
                        border: none;
                    }
                        table.lab-master-print-table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            border: none !important;
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
                        table.lab-master-print-table > thead > tr > td,
                        table.lab-master-print-table > tbody > tr > td,
                        table.lab-master-print-table > tfoot > tr > td {
                            border: none !important;
                            padding: 0 !important;
                        }
                        nextjs-portal, #__next-build-watcher {
                            display: none !important;
                        }
                    }
                `}</style>
        </div>
    );
});

ResultPrintView.displayName = 'ResultPrintView';

export default ResultPrintView;
