"use client";

import React from "react";
import { usePrintStore } from '@/stores/printStore';
import PrintSettingsToggle from '@/components/printers/PrintSettingsToggle';
// ============================================================================
// UTILITY: NUMBER TO WORDS (INDIAN FORMAT)
// ============================================================================
function numberToWords(num: number): string {
   if (num === 0) return "Zero Only";
   const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
   const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

   const inWords = (n: any): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
      return '';
   };

   const convert = (n: number) => {
      let str = '';
      const crores = Math.floor(n / 10000000);
      n %= 10000000;
      if (crores > 0) str += inWords(crores) + 'Crore ';

      const lakhs = Math.floor(n / 100000);
      n %= 100000;
      if (lakhs > 0) str += inWords(lakhs) + 'Lakh ';

      const thousands = Math.floor(n / 1000);
      n %= 1000;
      if (thousands > 0) str += inWords(thousands) + 'Thousand ';

      if (n > 0) str += inWords(n);
      return str.trim();
   };

   return convert(Math.floor(num)) + " Only";
}

interface PrintablePayslipProps {
   payroll: any;
   hospital: any;
}

export const PrintablePayslip = React.forwardRef<HTMLDivElement, PrintablePayslipProps>(({ payroll, hospital }, ref) => {
   const rx = payroll || {};
   const h = hospital || { name: 'Institutional Healthcare', address: 'Hospital Complex', phone: '91-0000000000', email: 'admin@hospital.com', logo: '' };
   const u = rx.user || {};
   const b = rx.breakdown || {};
   const c = rx.ctc || {};

   const totalGross = (b.basic || 0) + (b.hra || 0) + (b.transportAllowance || 0) + (b.medicalAllowance || 0) + (b.specialAllowance || 0) + (b.bonus || 0) + (b.salaryArrears || 0);
   const totalDeducts = rx.totalDeductions || ((b.pf || 0) + (b.esi || 0) + (b.professionalTax || 0) + (b.tds || 0) + (b.salaryAdvance || 0));
   const netSalary = rx.netSalary || (totalGross - totalDeducts);
   const totalCTC = c.totalCTC || rx.ctc?.totalCTC || totalGross;

   const monthName = rx.startDate ? new Date(rx.startDate).toLocaleString('default', { month: 'short', year: 'numeric' }) : 'Jun-2025';
   const fullPeriod = rx.startDate && rx.endDate ?
      `(From ${new Date(rx.startDate).toLocaleDateString('en-GB')} To ${new Date(rx.endDate).toLocaleDateString('en-GB')})` :
      '(From 01/06/2025 To 30/06/2025)';

   return (
      <div ref={ref} className="bg-white text-black font-sans p-[4mm] leading-none box-border flex flex-col mx-auto overflow-hidden relative" style={{ width: '210mm', height: '297mm', maxHeight: '297mm', fontSize: '10px' }}>
         <PrintSettingsToggle />
         <PayslipContent h={h} u={u} rx={rx} b={b} c={c} monthName={monthName} fullPeriod={fullPeriod} totalGross={totalGross} totalDeducts={totalDeducts} netSalary={netSalary} totalCTC={totalCTC} />
      </div>
   );
});

function PayslipContent({ h, u, rx, b, c, monthName, fullPeriod, totalGross, totalDeducts, netSalary, totalCTC }: any) {
   const { printWithHeader } = usePrintStore();

   const InfoRow = ({ label, value }: { label: string, value: any }) => (
      <div className="flex text-[10px] leading-[0.9]">
         <span className="w-[120px] shrink-0 font-medium">{label}</span>
         <span className="w-[10px] shrink-0">:</span>
         <span className="font-bold flex-1">{value || 'N/A'}</span>
      </div>
   );

   return (
      <>
         {/* 1. Header (Centered) */}
         {printWithHeader ? (
         <div className="text-center mb-1 flex flex-col items-center">
            {/* Hospital Logo */}
            <div className="mb-0.5 flex flex-col items-center">
               {h.logo ? (
                  <img src={h.logo} alt="Hospital Logo" className="h-12 w-auto mb-1 object-contain" />
               ) : (
                  <div className="text-red-600 text-3xl font-black italic tracking-tighter">X</div>
               )}
               <div className="text-[14px] font-black tracking-[0.2em] uppercase">{h.name}</div>
            </div>
            <div className="text-[10px] font-bold opacity-80 uppercase w-[70%]">{h.address}</div>
            <div className="text-[10px] font-bold">Phone : <span className="font-black">{h.phone || '91-9000000000'}</span> e-Mail : <span className="font-black text-blue-600">{h.email || 'hospital@gmail.com'}</span></div>
            <div className="text-[13px] font-black uppercase mt-0.5">Pay Slip For the Month of {monthName}</div>
            <div className="text-[12px] font-bold">{fullPeriod}</div>
         </div>
         ) : (
            <div style={{ height: '120px', width: '100%' }}></div>
         )}
         {/* 2. Employee Identity (Bordered Box) */}
         <div className="border border-black p-1 mb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
               <div className="space-y-[-2px]">
                  <InfoRow label="Employee Name" value={u.name || rx.user?.name} />
                  <InfoRow label="Father's Name" value={u.fatherName || rx.fatherName} />
                  <InfoRow label="PAN" value={u.panNumber || rx.panNumber} />
                  <InfoRow label="PF A/c No" value={u.pfNumber || rx.pfNumber || 'N.A.'} />
                  <InfoRow label="Branch" value={rx.workLocation || u.workLocation || 'HYDERABAD'} />
                  <InfoRow label="Designation" value={rx.designation || u.designation || rx.user?.designation} />
                  <InfoRow label="Department" value={rx.department || u.department || rx.user?.department} />
                  <InfoRow label="Scale" value={u.scale || ''} />
                  <InfoRow label="Pay Mode" value={rx.paymentMethod?.replace('_', ' ').toUpperCase() || 'TRANSFER'} />
                  <InfoRow label="Resignation Date" value={u.resignationDate || ''} />
                  <InfoRow label="Address (Perm.)" value={u.permanentAddress || (u.address?.street ? `${u.address.street}, ${u.address.city}` : '')} />
                  <InfoRow label="Work Location" value={u.workLocation || rx.workLocation} />
                  <InfoRow label="E-Mail" value={u.email || rx.user?.email} />
                  <InfoRow label="Address (Corres.)" value={u.currentAddress || u.permanentAddress} />
                  <InfoRow label="Mobile" value={u.mobile || rx.user?.mobile} />
               </div>
               <div className="space-y-0">
                  <InfoRow label="Employee Code" value={u.employeeId || rx.user?.employeeId} />
                  <InfoRow label="DOJ" value={(u.joiningDate || rx.joiningDate) ? new Date(u.joiningDate || rx.joiningDate).toLocaleDateString('en-GB') : ''} />
                  <InfoRow label="Bank A/c No." value={u.bankDetails?.accountNumber || rx.bankAccount} />
                  <InfoRow label="ESI A/c No" value={u.esiNumber || rx.esiNumber || 'N.A.'} />
                  <InfoRow label="Department" value={u.department || rx.department} />
                  <InfoRow label="Category" value={u.category || 'UNIVERSAL'} />
                  <InfoRow label="Bank Name" value={u.bankDetails?.bankName} />
                  <InfoRow label="Gender" value={u.gender || rx.gender} />
                  <InfoRow label="Confirmation Date" value={u.confirmationDate || ''} />
                  <InfoRow label="Shift" value={u.shift || 'DAY SHIFT'} />
                  <InfoRow label="DOB" value={(u.dob || rx.dob) ? new Date(u.dob || rx.dob).toLocaleDateString('en-GB') : ''} />
                  <InfoRow label="UAN" value={u.uanNumber || rx.uanNumber || 'N.A.'} />
                  <InfoRow label="Aadhar No." value={u.aadharNumber || rx.aadharNumber} />
               </div>
            </div>
         </div>

         {/* 3. Attendance Registry (Bordered Box) */}
         <div className="border-x border-b border-black p-1 mb-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
               <div className="space-y-[-2px]">
                  <InfoRow label="Month Days" value={rx.monthDays || 30} />
                  <InfoRow label="Weekly-Off" value={rx.weeklyOffDays || 0} />
                  <InfoRow label="Paid Holidays" value={rx.paidHolidays || 0} />
                  <InfoRow label="Working Days" value={(rx.monthDays || 30) - (rx.weeklyOffDays || 0)} />
                  <InfoRow label="LWP" value={rx.absentDays || 0} />
                  <InfoRow label="Present Days" value={rx.presentDays || 0} />
               </div>
               <div className="space-y-0">
                  <InfoRow label="Total Paid Days" value={rx.presentDays + rx.leaveDays} />
                  <InfoRow label="Days-Off" value={rx.daysOff || 0} />
                  <InfoRow label="Unpaid Holidays" value={rx.unpaidHolidays || 0} />
                  <InfoRow label="Max Payable Days" value={rx.monthDays || 30} />
                  <InfoRow label="Net Paid Days" value={rx.presentDays + rx.leaveDays} />
                  <InfoRow label="Paid Leaves" value={rx.leaveDays || 0} />
               </div>
            </div>
         </div>

         {/* 4. Main Financial Table */}
         <div className="border border-black overflow-hidden mb-0">
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full border-collapse">
               <thead>
                  <tr className="border-b border-black font-black bg-white">
                     <th className="border-r border-black p-0 text-left w-[36%]">Earnings</th>
                     <th className="border-r border-black p-0 text-right w-[14%]">Amount Rs.</th>
                     <th className="border-r border-black p-0 text-left w-[36%]">Deductions</th>
                     <th className="p-0 text-right w-[14%]">Amount Rs.</th>
                  </tr>
               </thead>
               <tbody>
                  {/* Data Rows - Standard Model */}
                  {[
                     { el: 'BASIC SALARY', ev: b.basic, dl: 'PF', dv: b.pf },
                     { el: 'HRA', ev: b.hra, dl: 'ESI', dv: b.esi },
                     { el: 'TRANSPORT ALLOWANCE', ev: b.transportAllowance, dl: 'PROFESSIONAL TAX', dv: b.professionalTax },
                     { el: 'Medical Allowance', ev: b.medicalAllowance, dl: 'Salary Advance', dv: b.salaryAdvance },
                     { el: 'Special Allowance', ev: b.specialAllowance, dl: 'TDS', dv: b.tds },
                     { el: 'Salary Arrears', ev: b.salaryArrears, dl: '', dv: null },
                     { el: 'Bonus', ev: b.bonus, dl: '', dv: null },
                  ].map((row, idx) => (
                     <tr key={idx} className="text-[10px]">
                        <td className="border-r border-black p-0 px-0.5 uppercase">{row.el}</td>
                        <td className="border-r border-black p-0 px-0.5 text-right">{row.ev !== null ? (row.ev || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                        <td className="border-r border-black p-0 px-0.5 uppercase">{row.dl}</td>
                        <td className="p-0 px-0.5 text-right">{row.dv !== null ? (row.dv || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                     </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t border-black font-black uppercase">
                     <td className="border-r border-black p-0 px-0.5">Total Earnings</td>
                     <td className="border-r border-black p-0 px-0.5 text-right">{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                     <td className="border-r border-black p-0 px-0.5">Total Deductions</td>
                     <td className="p-0 px-0.5 text-right">{totalDeducts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {/* Net Pay Row */}
                  <tr className="border-t border-black font-black">
                     <td className="p-0 px-0.5" colSpan={4}>
                        <div className="flex">
                           <span className="w-12">Net Pay</span>
                           <span>: Rs. {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                     </td>
                  </tr>
                  {/* In Words Row */}
                  <tr className="border-t border-black font-bold">
                     <td className="p-0 px-0.5" colSpan={4}>
                        <div className="flex">
                           <span className="w-12">In Words</span>
                           <span>: Rs. {numberToWords(netSalary)}</span>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table></div>
         </div>

         {/* 5. CTC Section (Exact Model) */}
         <div className="border-x border-b border-black">
            <div className="border-b border-black p-0 font-black uppercase text-[10px]">Employer's Contribution (CTC)</div>
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full border-collapse">
               <tbody>
                  <tr>
                     <td className="border-r border-black p-0 px-0.5 w-[86%]">GROSS EARNING</td>
                     <td className="p-0 px-0.5 text-right w-[14%] font-bold">{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-0 px-0.5">EMPLOYER'S PROVIDENT FUND</td>
                     <td className="p-0 px-0.5 text-right font-bold">{c.providentFund ? c.providentFund.toLocaleString() : 'Nil'}</td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-0 px-2 italic opacity-60">- - {'>'} PENSION FUND</td>
                     <td className="p-0 px-0.5 text-right text-[7.2px] font-bold">Nil</td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-0 px-2 italic opacity-60">- - {'>'} PROVIDENT FUND</td>
                     <td className="p-0 px-0.5 text-right text-[7.2px] font-bold">Nil</td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-0 px-0.5">EMPLOYER'S STATE INSURANCE</td>
                     <td className="p-0 px-0.5 text-right font-bold">{c.employerEsi ? c.employerEsi.toLocaleString() : 'Nil'}</td>
                  </tr>
                  <tr className="border-y border-black font-black uppercase text-right">
                     <td className="border-r border-black p-0 px-0.5">Total :</td>
                     <td className="p-0 px-0.5">{totalCTC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-black">
                     <td className="p-0 px-0.5" colSpan={2}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                           <div>
                              <div className="flex"><span className="w-12 uppercase">Total CTC</span><span>: Rs. {totalCTC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                              <div className="flex"><span className="w-12 uppercase">In Words</span><span className="font-bold underline">: Rs. {numberToWords(totalCTC)}</span></div>
                           </div>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table></div>
         </div>

         {/* 6. Footer Notes */}
         {printWithHeader ? (
         <>
         <div className="mt-0.5 space-y-[-2px] text-[7.2px] font-bold">
            <p>TDS Deducted Upto {monthName} : Rs. Nil</p>
            <p>This is Computer Generated Sheet, does not require Signature.</p>
         </div>

         {/* 7. Signatory */}
         <div className="mt-auto border-t border-black pt-1 flex justify-end">
            <div className="text-center w-48 border-t border-black pt-0">
               <p className="text-[10px] font-black uppercase tracking-widest">Authorised Signatory</p>
            </div>
         </div>
         </>
         ) : (
            <div style={{ height: '80px', width: '100%' }}></div>
         )}

      </>
   );
}

PrintablePayslip.displayName = "PrintablePayslip";
