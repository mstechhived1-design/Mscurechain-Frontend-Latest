"use client";

import React, { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  Edit3,
  Activity,
  FileText,
  IndianRupee
} from "lucide-react";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { toast } from "react-hot-toast";
import { generatePayslipHtml } from "@/lib/print-utils";

export default function PayrollResolutionPage() {
  const { hospitalId, id } = useParams() as any;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payroll, setPayroll] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [staff, setStaff] = useState<any>(null);

  useEffect(() => {
    if (id) fetchFullAudit();
  }, [id]);

  const fetchFullAudit = async () => {
    try {
      setLoading(true);
      const res = await hospitalAdminService.getPayroll();
      const record = res.payrolls.find((p: any) => p._id === id);
      if (record) {
        setPayroll(record);
        if (res.hospital) setHospital(res.hospital);
        
        try {
          const sRes = await hospitalAdminService.getStaffById(record.userId || record.user?._id);
          setStaff(sRes.staff || {});
        } catch (e) {
          console.error("Staff fetch failed");
        }
      }
    } catch (e) {
      toast.error("Audit fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printData = {
        payroll: { ...payroll, user: staff },
        hospital: hospital
      };
      printWindow.document.write(generatePayslipHtml(printData));
      printWindow.document.close();
      toast.success("Pay Slip Generated");
    } else {
      toast.error("Please allow popups to print");
    }
  };

  if (loading) return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Retrieving resolution data...</p>
        </div>
     </div>
  );

  if (!payroll) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="text-center p-12 bg-white rounded-xl shadow-xs border border-gray-100">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Manifest Not Found</h2>
          <button onClick={() => router.back()} className="mt-4 px-3 md:px-6 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase active:scale-95 transition-all">Back to Registry</button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Action Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 print:hidden px-2 md:px-8 py-2 md:py-4 flex items-center justify-between shadow-xs">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-lg transition-all text-gray-400 hover:text-emerald-600"><ArrowLeft size={20} /></button>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payroll Resolution Protocol</h1>
         </div>
         <div className="flex gap-3">
            <button onClick={() => router.push(`/${hospitalId}/hospital-admin/payroll/resolution/${id}/edit`)} className="px-2 md:px-6 py-2 md:py-2.5 bg-gray-50 text-gray-700 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-gray-100 font-bold">
               <Edit3 size={14} className="inline mr-2" /> Modify Entry
            </button>
            <button onClick={handlePrint} className="px-2 md:px-8 py-2 md:py-2.5 bg-emerald-600 text-white rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all font-bold">
               <Printer size={14} className="inline mr-2" /> Execute Print
            </button>
         </div>
      </div>

       {/* Payslip Preview Container */}
       <div className="max-w-7xl mx-auto mt-8 flex flex-col items-center px-4">
          <div className="shadow-2xl print:hidden bg-white p-4 md:p-10 rounded-xl border border-gray-100 w-full max-w-4xl">
             <div className="text-center mb-10">
                <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-emerald-600/20">
                   <Activity size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{hospital?.name || 'Institutional Management'}</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Official Resource Settlement Manifest</p>
             </div>

             {/* Employee Info */}
             <div className="bg-gray-50 dark:bg-white/5 p-3 md:p-6 rounded-xl mb-6 border border-gray-100">
                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <FileText size={14} /> Personnel Entity Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                   <div className="space-y-3">
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Identity:</span> <span className="font-bold text-gray-900">{staff?.name || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Signature ID:</span> <span className="font-bold text-gray-700">{staff?.employeeId || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Designation:</span> <span className="font-bold text-gray-700">{staff?.designation || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Dept Node:</span> <span className="font-bold text-gray-700">{staff?.department || 'N/A'}</span></p>
                   </div>
                   <div className="space-y-3">
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Activation:</span> <span className="font-bold text-gray-700">{staff?.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-GB') : 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Comms:</span> <span className="font-bold text-gray-700">{staff?.mobile || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Credential:</span> <span className="font-bold text-gray-700 truncate max-w-[150px]">{staff?.email || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Contract Base:</span> <span className="font-black text-emerald-600">₹{staff?.baseSalary?.toLocaleString() || 'N/A'}</span></p>
                   </div>
                </div>
             </div>

             {/* Attendance */}
             <div className="bg-emerald-50/50 p-3 md:p-6 rounded-xl mb-6 border border-emerald-100">
                <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Activity size={14} /> Duty Resolution Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                   <div className="text-center md:text-left">
                      <p className="font-bold text-gray-400 uppercase text-[9px] mb-1">Cycle Duration</p>
                      <p className="font-black text-gray-700 text-sm md:text-base">{payroll?.monthDays || 30} Days</p>
                   </div>
                   <div className="text-center md:text-left">
                      <p className="font-bold text-gray-400 uppercase text-[9px] mb-1">Duty Recorded</p>
                      <p className="font-black text-emerald-600 text-sm md:text-base">{payroll?.presentDays || 0} Units</p>
                   </div>
                   <div className="text-center md:text-left">
                      <p className="font-bold text-gray-400 uppercase text-[9px] mb-1">Auth Leaves</p>
                      <p className="font-black text-amber-600 text-sm md:text-base">{payroll?.leaveDays || 0} Units</p>
                   </div>
                   <div className="text-center md:text-left">
                      <p className="font-bold text-gray-400 uppercase text-[9px] mb-1">Weekly Nodes</p>
                      <p className="font-black text-gray-700 text-sm md:text-base">{payroll?.weeklyOffDays || 0} Units</p>
                   </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-100">
                   <div>
                      <p className="font-bold text-gray-400 uppercase text-[9px] mb-1">Absent (LWP)</p>
                      <p className="font-black text-rose-600">{payroll?.absentDays || 0} Units</p>
                   </div>
                   <div>
                      <p className="font-bold text-gray-400 uppercase text-[9px] mb-1">Total Paid units</p>
                      <p className="font-black text-emerald-700">{(payroll?.presentDays || 0) + (payroll?.leaveDays || 0) + (payroll?.weeklyOffDays || 0)} Units</p>
                   </div>
                </div>
             </div>

             {/* Salary Breakdown */}
             <div className="bg-white p-3 md:p-6 rounded-xl mb-6 border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <IndianRupee size={14} className="text-emerald-500" /> Resolution Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm">
                   <div className="space-y-4">
                      <h4 className="font-black text-[9px] text-emerald-600 uppercase tracking-[0.2em] mb-4 border-b border-emerald-50 pb-2">Institutional Earnings</h4>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Basic Quantum (50%):</span> <span className="font-black text-gray-700">₹{payroll?.breakdown?.basic?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">HRA Allocation (20%):</span> <span className="font-black text-gray-700">₹{payroll?.breakdown?.hra?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Special Provision:</span> <span className="font-black text-gray-700">₹{payroll?.breakdown?.specialAllowance?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Transport Node:</span> <span className="font-black text-gray-700">₹{payroll?.breakdown?.transportAllowance?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Medical Provision:</span> <span className="font-black text-gray-700">₹{payroll?.breakdown?.medicalAllowance?.toLocaleString() || '0'}</span></p>
                   </div>
                   <div className="space-y-4">
                      <h4 className="font-black text-[9px] text-rose-600 uppercase tracking-[0.2em] mb-4 border-b border-rose-50 pb-2">Statutory Deductions</h4>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Provident Fund (PF):</span> <span className="font-bold text-rose-500">₹{payroll?.breakdown?.pf?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">State Ins. (ESI):</span> <span className="font-bold text-rose-500">₹{payroll?.breakdown?.esi?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Prof. Tax Hub:</span> <span className="font-bold text-rose-500">₹{payroll?.breakdown?.professionalTax?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Income Tax (TDS):</span> <span className="font-bold text-rose-500">₹{payroll?.breakdown?.tds?.toLocaleString() || '0'}</span></p>
                      <p className="flex justify-between"><span className="font-bold text-gray-500">Advance Recovery:</span> <span className="font-bold text-rose-500">₹{payroll?.breakdown?.salaryAdvance?.toLocaleString() || '0'}</span></p>
                   </div>
                </div>
                <div className="mt-10 pt-8 border-t border-dashed border-gray-200 space-y-3">
                   <div className="flex justify-between items-center px-4">
                      <span className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Gross Institutional Earning:</span>
                      <span className="font-black text-gray-600 text-xs md:text-base md:text-lg">₹{payroll?.grossEarning?.toLocaleString() || '0'}</span>
                   </div>
                   <div className="flex justify-between items-center px-4">
                      <span className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Aggregate Deductions:</span>
                      <span className="font-black text-rose-600 text-xs md:text-base md:text-lg">₹{payroll?.totalDeductions?.toLocaleString() || '0'}</span>
                   </div>
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0 bg-emerald-600 p-3 md:p-6 rounded-xl mt-6 shadow-lg shadow-emerald-500/20 text-white">
                      <span className="font-black text-white uppercase tracking-[0.2em] text-[10px] md:text-sm">Final Net Resolution:</span>
                      <span className="font-black text-white text-2xl md:text-3xl">₹{payroll?.netSalary?.toLocaleString() || '0'}</span>
                   </div>
                </div>
             </div>

             <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em] mt-8 opacity-40">
                Official institutional settlement preview • No digital signature required
             </div>
          </div>
       </div>
    </div>
  );
}
