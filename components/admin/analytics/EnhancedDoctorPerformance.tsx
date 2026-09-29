import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronRight, Download, Activity, FlaskConical, Pill, Building2, Layers } from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { HOSPITAL_ADMIN_ENDPOINTS } from '@/lib/integrations/config/endpoints';
import { Card } from '@/components/admin/Card';
import ExcelJS from 'exceljs';

interface EnhancedDoctorPerformanceProps {
  range: string;
  startDate: string;
  endDate: string;
  formatCurrency: (val: number) => string;
}

export const EnhancedDoctorPerformance: React.FC<EnhancedDoctorPerformanceProps> = ({ range, startDate, endDate, formatCurrency }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['hospital-doctor-performance-detailed', range, startDate, endDate],
    queryFn: async () => {
      const url = new URL(`${window.location.origin}${HOSPITAL_ADMIN_ENDPOINTS.DOCTOR_PERFORMANCE}`);
      url.searchParams.append('range', range);
      if (startDate) url.searchParams.append('startDate', startDate);
      if (endDate) url.searchParams.append('endDate', endDate);
      return await apiClient<any[]>(url.pathname + url.search);
    },
    staleTime: 60000,
  });

  const filteredDoctors = (doctors || []).filter((doc: any) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportDoctorData = async (doc: any) => {
    try {
      // 1. Fetch Detailed Transactions
      const url = new URL(`${window.location.origin}${HOSPITAL_ADMIN_ENDPOINTS.DOCTOR_PERFORMANCE_DETAILS(doc.doctorId)}`);
      url.searchParams.append('range', range);
      if (startDate) url.searchParams.append('startDate', startDate);
      if (endDate) url.searchParams.append('endDate', endDate);
      
      const transactions: any[] = await apiClient(url.pathname + url.search);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Transactions');

      // Helper for borders
      const borderAll = {
        top: { style: 'thin' as ExcelJS.BorderStyle },
        left: { style: 'thin' as ExcelJS.BorderStyle },
        bottom: { style: 'thin' as ExcelJS.BorderStyle },
        right: { style: 'thin' as ExcelJS.BorderStyle }
      };

      // 1. Title Row
      sheet.mergeCells('A1:G1');
      const titleRow = sheet.getRow(1);
      titleRow.getCell(1).value = 'DOCTOR PERFORMANCE TRANSACTION SUMMARY REPORT';
      titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 25;

      // 2. Doctor / Hospital Info
      sheet.mergeCells('A2:G2');
      const docRow = sheet.getRow(2);
      docRow.getCell(1).value = `Doctor: ${doc.name.toUpperCase()} (${doc.department})`;
      docRow.getCell(1).font = { name: 'Calibri', size: 11, color: { argb: 'FF1A4B8C' } }; // slightly bluish
      docRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      docRow.height = 20;

      // 3. Report Date
      sheet.mergeCells('A3:G3');
      const dateRow = sheet.getRow(3);
      const reportDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
      dateRow.getCell(1).value = `Report Date : ${reportDate}`;
      dateRow.getCell(1).font = { name: 'Calibri', size: 10, italic: true };
      dateRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      dateRow.height = 18;

      sheet.addRow([]); // Blank row 4

      // 4. Headers
      const headers = ['S.No', 'Date & Time', 'Patient Name', 'Module Type', 'Details', 'Payment Mode', 'Total Amount'];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 25;
      
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2B4C' } }; // Dark blue from screenshot
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderAll;
      });

      // 5. Data Rows
      let totalAmount = 0;
      
      transactions.forEach((tx, index) => {
        const dateObj = new Date(tx.date);
        const dateStr = dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
        
        const row = sheet.addRow([
          index + 1,
          dateStr,
          tx.patientName,
          tx.module,
          tx.details,
          tx.paymentMode,
          tx.amount || 0
        ]);

        totalAmount += (tx.amount || 0);

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = borderAll;
          if (colNumber === 7) {
             cell.numFmt = '₹#,##0.00';
             cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
             cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      // 6. Column Widths
      sheet.getColumn(1).width = 8;  // S.No
      sheet.getColumn(2).width = 20; // Date & Time
      sheet.getColumn(3).width = 25; // Patient Name
      sheet.getColumn(4).width = 15; // Module Type
      sheet.getColumn(5).width = 30; // Details
      sheet.getColumn(6).width = 15; // Payment Mode
      sheet.getColumn(7).width = 18; // Total Amount

      // Enable AutoFilter for the data table (from Header Row 5 to end of data)
      sheet.autoFilter = `A5:G${transactions.length + 5}`;

      // 7. Totals Row at the bottom of the table
      const totalRow = sheet.addRow(['', '', '', '', '', 'TOTALS:', totalAmount]);
      totalRow.height = 25;
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        if (colNumber >= 6) {
          cell.border = borderAll;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }
        if (colNumber === 6) cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (colNumber === 7) {
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      sheet.addRow([]);
      sheet.addRow([]);

      // 8. Payment Mode Breakdown
      const breakDownStartRow = sheet.rowCount + 1;
      const breakdownHeader = sheet.addRow(['', '', 'PAYMENT MODE BREAKDOWN']);
      breakdownHeader.getCell(3).font = { name: 'Calibri', size: 10, bold: true, underline: true };

      const paySum = doc.paymentSummary;
      
      const addBreakdownRow = (label: string, amount: number, isDue: boolean = false) => {
        const r = sheet.addRow(['', '', label, amount]);
        r.getCell(3).font = { name: 'Calibri', size: 10, color: isDue ? { argb: 'FFDC2626' } : undefined, bold: isDue };
        r.getCell(4).numFmt = '₹#,##0.00';
        r.getCell(4).font = { name: 'Calibri', size: 10, color: isDue ? { argb: 'FFDC2626' } : undefined, bold: isDue };
        r.getCell(4).alignment = { horizontal: 'right' };
        
        // Add borders to the two cells
        r.getCell(3).border = borderAll;
        r.getCell(4).border = borderAll;
      };

      addBreakdownRow('Total Cash :', paySum.cash);
      addBreakdownRow('Total Card :', paySum.card);
      addBreakdownRow('Total UPI :', paySum.upi);
      addBreakdownRow('Total Due :', paySum.due, true);

      sheet.addRow([]);
      
      // 9. Prepared By
      const prepRow = sheet.addRow(['', '', '', '', '', 'Prepared By: Hospital Admin']);
      prepRow.getCell(6).font = { name: 'Calibri', size: 10, italic: true, bold: true };
      prepRow.getCell(6).alignment = { horizontal: 'right' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Doctor_Performance_${doc.name.replace(/\s+/g, '_')}_Detailed.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to generate detailed export. Please try again.');
    }
  };



  return (
    <Card className="p-2 md:p-6 border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm md:text-lg font-bold text-slate-900">Doctor Performance</h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Cross-Module Analytics</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
             <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
             <p className="text-xs font-bold text-slate-400 uppercase">Calculating Multidimensional Metrics</p>
          </div>
        ) : (
          <div className="w-full min-w-[600px] flex flex-col gap-2">
            <div className="grid grid-cols-[3fr_2fr_1fr_2fr] gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2 border-b border-slate-100">
              <div>Doctor</div>
              <div>Department</div>
              <div className="text-center">Patients</div>
              <div className="text-right">Total Revenue</div>
            </div>

            {filteredDoctors.length > 0 ? filteredDoctors.map((doc: any) => {
              const isExpanded = expandedDoc === doc.doctorId;
              
              return (
                <div key={doc.doctorId} className={`flex flex-col border rounded-xl transition-all ${isExpanded ? 'border-indigo-200 shadow-sm bg-white' : 'border-transparent hover:border-slate-100 hover:bg-slate-50'}`}>
                  {/* Summary Row */}
                  <div 
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.doctorId)}
                    className="grid grid-cols-[3fr_2fr_1fr_2fr] gap-4 items-center px-4 py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                    </div>
                    <div className="text-slate-500 text-xs font-medium">{doc.department}</div>
                    <div className="text-center font-bold text-slate-700 text-xs bg-slate-100 py-1 rounded-md">{doc.totalPatients}</div>
                    <div className="text-right font-black text-slate-900 text-sm">{formatCurrency(doc.totalRevenue)}</div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-indigo-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Deep Dive Analytics</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); exportDoctorData(doc); }}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                        >
                          <Download size={12} />
                          Export Doctor Data
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Modules Breakdown */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Layers size={12} /> Module Revenue Breakdown
                          </h4>
                          <div className="space-y-2.5">
                            {[
                              { label: 'OPD', icon: Activity, data: doc.sections.opd, color: 'text-blue-600', bg: 'bg-blue-500' },
                              { label: 'Lab', icon: FlaskConical, data: doc.sections.lab, color: 'text-amber-600', bg: 'bg-amber-500' },
                              { label: 'Pharmacy', icon: Pill, data: doc.sections.pharmacy, color: 'text-emerald-600', bg: 'bg-emerald-500' },
                              { label: 'IPD', icon: Building2, data: doc.sections.ipd, color: 'text-indigo-600', bg: 'bg-indigo-500' }
                            ].map((mod, idx) => (
                              <div key={idx} className="flex flex-col gap-1">
                                <div className="flex justify-between items-end">
                                  <div className="flex items-center gap-1.5">
                                    <mod.icon size={12} className={mod.color} />
                                    <span className="text-[11px] font-bold text-slate-600">{mod.label}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">({mod.data.count})</span>
                                  </div>
                                  <span className="text-xs font-black text-slate-800">{formatCurrency(mod.data.revenue)}</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${mod.bg}`} 
                                    style={{ width: `${doc.totalRevenue > 0 ? Math.max(2, (mod.data.revenue / doc.totalRevenue) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment Collection Breakdown */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Collection Breakdown</h4>
                          <div className="grid grid-cols-2 gap-2 h-[calc(100%-24px)]">
                            <div className="bg-white border border-slate-100 p-2.5 rounded-lg flex flex-col justify-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Cash</span>
                              <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(doc.paymentSummary.cash)}</span>
                            </div>
                            <div className="bg-white border border-slate-100 p-2.5 rounded-lg flex flex-col justify-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">UPI</span>
                              <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(doc.paymentSummary.upi)}</span>
                            </div>
                            <div className="bg-white border border-slate-100 p-2.5 rounded-lg flex flex-col justify-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Card</span>
                              <span className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(doc.paymentSummary.card)}</span>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-2.5 rounded-lg flex flex-col justify-center">
                              <span className="text-[9px] font-bold text-red-400 uppercase">Due Amount</span>
                              <span className="text-xs font-black text-red-600 mt-0.5">{formatCurrency(doc.paymentSummary.due)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="py-12 text-center text-slate-400 text-xs italic">No clinical data found for this range</div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
