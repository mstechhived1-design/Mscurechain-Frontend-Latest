"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Activity,
  IndianRupee,
  Zap,
  UserCheck
} from "lucide-react";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { toast } from "react-hot-toast";

export default function PayrollEditPage() {
  const { hospitalId, id } = useParams() as any;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [staff, setStaff] = useState<any>(null);

  useEffect(() => {
    if (id) fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const res = await hospitalAdminService.getPayroll();
      const record = res.payrolls.find((p: any) => p._id === id);
      
      if (record) {
         let staffData = {};
         try {
            const staffRes = await hospitalAdminService.getStaffById(record.userId || record.user?._id);
            staffData = staffRes.staff || {};
            setStaff(staffData);
         } catch (e) { 
            console.error("Staff fetch failed"); 
         }

          // Initialize Form
          const initialData = {
             ...record,
             ...record.breakdown,
             monthDays: record.monthDays || 30,
             weeklyOffDays: record.weeklyOffDays || 0,
             netSalary: record.netSalary || 0,
             totalDeduction: record.totalDeductions || 0,
             grossEarning: (record.breakdown?.basic || 0) + (record.breakdown?.hra || 0) + (record.breakdown?.specialAllowance || 0) + (record.breakdown?.transportAllowance || 0) + (record.breakdown?.medicalAllowance || 0) + (record.breakdown?.bonus || 0) + (record.breakdown?.salaryArrears || 0)
          };
         
         setFormData(initialData);

         // If the record has 0 earnings but staff has baseSalary, try an auto-resolve on load
         if (initialData.grossEarning === 0 && (staffData as any).baseSalary > 0) {
            console.log("Auto-resolving zero payroll...");
         }
      }
    } catch (error: any) {
      toast.error("Failed to fetch record");
    } finally {
      setLoading(false);
    }
  };

  /**
   * AUTOMATIC CALCULATION ENGINE
   * Prorates the contractual salary based on attendance.
   */
  const syncWithAttendance = (data: any, staffRef: any = staff) => {
    const monthDays = Number(data.monthDays) || 30;
    const present = Number(data.presentDays) || 0;
    const leaves = Number(data.leaveDays) || 0;
    const weeklyOff = Number(data.weeklyOffDays) || 0;

    // FETCH BASE SALARY (Resilient Check - check multiple possible field names)
    const baseSalary = Number(staffRef?.baseSalary) || Number(staffRef?.salary) || Number(staffRef?.ctc) || 0;
    if (baseSalary === 0 || isNaN(baseSalary)) return data;

    // 1. Calculate Ratio (Include Weekly Offs as paid)
    const ratio = Math.min(1, (present + leaves + weeklyOff) / monthDays);
    const proratedGross = Math.max(0, Math.round(baseSalary * (isNaN(ratio) ? 0 : ratio)));

    // 2. Distribute into Earnings (50/20/5/5/20 Institutional Model)
    const basic = Math.round(proratedGross * 0.5);
    const hra = Math.round(proratedGross * 0.2);
    const transportAllowance = Math.round(proratedGross * 0.05); 
    const medicalAllowance = Math.round(proratedGross * 0.05); 
    const special = Math.max(0, proratedGross - basic - hra - transportAllowance - medicalAllowance);

    // 3. Deductions (REMOVED statutory taxes)
    const pf = 0;
    const esi = 0;
    const pt = 0;

    const totalDeducts = pf + esi + pt + (Number(data.tds) || 0) + (Number(data.salaryAdvance) || 0);
    const net = Math.max(0, proratedGross - totalDeducts);

    return {
      ...data,
      basic,
      hra,
      specialAllowance: special,
      transportAllowance,
      medicalAllowance,
      pf,
      esi,
      professionalTax: pt,
      grossEarning: proratedGross,
      totalDeduction: totalDeducts,
      netSalary: net
    };
  };

  const updateAttendance = (field: string, value: any) => {
    setFormData((prev: any) => {
      const val = Math.max(0, Number(value));
      const updated = { ...prev, [field]: val };
      
      // Auto-rebalance absences if user touches present/leaves
      if (field === 'presentDays' || field === 'leaveDays' || field === 'weeklyOffDays') {
         updated.absentDays = Math.max(0, prev.monthDays - updated.presentDays - updated.leaveDays - (field === 'weeklyOffDays' ? val : updated.weeklyOffDays));
      }
      
      return syncWithAttendance(updated);
    });
  };

  const updateManualField = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: Number(value) };
      // Manual sum if user overrides auto-fields
      const gross = (updated.basic || 0) + (updated.hra || 0) + (updated.specialAllowance || 0) + (updated.transportAllowance || 0) + (updated.medicalAllowance || 0) + (updated.bonus || 0) + (updated.salaryArrears || 0);
      const deducts = (updated.pf || 0) + (updated.esi || 0) + (updated.professionalTax || 0) + (updated.tds || 0) + (updated.salaryAdvance || 0);
      return {
        ...updated,
        grossEarning: gross,
        totalDeduction: deducts,
        netSalary: gross - deducts
      };
    });
  };

  // MARK ALL PRESENT Logic
  const setAllPresent = async () => {
    console.log("setAllPresent called");
    console.log("Staff data:", staff);
    console.log("Form data:", formData);

    // Check for baseSalary in multiple possible locations
    const baseSalary = Number(staff?.baseSalary) || Number(staff?.salary) || Number(staff?.ctc) || 0;

    if (baseSalary === 0) {
       console.error("Staff base salary missing. Available fields:", Object.keys(staff || {}));
       toast.error("Staff base salary missing in registry. Please fix staff profile first.");
       return;
    }

    console.log("Using baseSalary:", baseSalary);

    // Calculate first, then update state and save
    const currentMonthDays = Number(formData.monthDays) || 30;
    const currentWeeklyOff = Number(formData.weeklyOffDays) || 0;
    const maxWorkDays = currentMonthDays - currentWeeklyOff;
    
    const updated = {
      ...formData,
      monthDays: currentMonthDays,
      presentDays: maxWorkDays,
      leaveDays: 0,
      absentDays: 0
    };

    const calculated = syncWithAttendance(updated, { ...staff, baseSalary });

    // Auto-save after calculation
    try {
      setSaving(true);
      const updatePayload = {
        ...calculated,
        netSalary: calculated.netSalary,
        totalDeductions: calculated.totalDeduction,
        breakdown: {
          basic: calculated.basic,
          hra: calculated.hra,
          transportAllowance: calculated.transportAllowance || 0,
          medicalAllowance: calculated.medicalAllowance || 0,
          specialAllowance: calculated.specialAllowance,
          salaryArrears: calculated.salaryArrears || 0,
          bonus: calculated.bonus || 0,
          pf: calculated.pf,
          esi: calculated.esi,
          professionalTax: calculated.professionalTax,
          salaryAdvance: calculated.salaryAdvance || 0,
          tds: calculated.tds || 0
        }
      };
      await hospitalAdminService.updatePayroll(id as string, updatePayload);
      toast.success("Full Month Resolve Applied - Salary Calculated & Saved");
      
      // Redirect to registry after auto-save on All Present
      router.push(`/${hospitalId}/hospital-admin/payroll`);
    } catch (e) {
      console.error("Auto-save failed:", e);
      toast.error("Auto-save failed. Please click Sync Registry manually.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatePayload = {
        ...formData,
        netSalary: formData.netSalary,
        totalDeductions: formData.totalDeduction,
        breakdown: {
          basic: formData.basic,
          hra: formData.hra,
          transportAllowance: formData.transportAllowance || 0,
          medicalAllowance: formData.medicalAllowance || 0,
          specialAllowance: formData.specialAllowance,
          salaryArrears: formData.salaryArrears || 0,
          bonus: formData.bonus || 0,
          pf: formData.pf,
          esi: formData.esi,
          professionalTax: formData.professionalTax,
          salaryAdvance: formData.salaryAdvance || 0,
          tds: formData.tds || 0
        }
      };
      await hospitalAdminService.updatePayroll(id as string, updatePayload);
      toast.success("Payroll Registry Synchronized");
      router.push(`/${hospitalId}/hospital-admin/payroll`);
    } catch (e) {
       toast.error("Synchronization failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Initializing calculation engine...</p>
        </div>
     </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-4 md:py-10 px-2 md:px-4 space-y-6 min-h-screen">
      {/* Identity Action Bar */}
      <div className="bg-white rounded-xl p-3 md:p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
               <h1 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">{staff?.name || 'Voucher...'}</h1>
               <p className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">{staff?.designation || 'Staff'} • {staff?.employeeId}</p>
            </div>
         </div>
         <div className="flex w-full md:w-auto items-center gap-2 md:gap-3">
            <button onClick={setAllPresent} disabled={saving} className="flex-1 md:flex-none px-2 md:px-6 py-2 md:py-2.5 bg-emerald-50 text-emerald-600 font-bold text-[9px] md:text-[10px] uppercase tracking-widest rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100 shadow-xs active:scale-95 disabled:opacity-50 flex items-center justify-center">
               <UserCheck size={14} className="inline mr-1 md:mr-2" /> {saving ? 'Processing...' : 'Mark All Present'}
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none px-2 md:px-8 py-2 md:py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold text-[9px] md:text-[10px] uppercase tracking-widest rounded-lg hover:bg-black dark:hover:bg-gray-100 transition-all shadow-lg active:scale-95 flex items-center justify-center">
              {saving ? 'Syncing...' : <><Save size={14} className="inline mr-1 md:mr-2" /> Sync Registry</>}
            </button>
         </div>
      </div>

      {/* Logic Driver: Attendance Controller */}
      <div className="bg-emerald-600 rounded-xl p-2 md:p-4 md:p-8 text-white shadow-xl shadow-emerald-500/10 border border-emerald-500/20">
         <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Month Days', value: formData.monthDays, field: 'monthDays', readOnly: true },
              { label: 'Present', value: formData.presentDays || 0, field: 'presentDays', color: 'bg-emerald-500/20' },
              { label: 'Auth Leaves', value: formData.leaveDays || 0, field: 'leaveDays', color: 'bg-white/10' },
              { label: 'Absents (LWP)', value: formData.absentDays || 0, field: 'absentDays', color: 'bg-rose-500/20' },
            ].map(item => (
              <div key={item.field} className={`p-2 md:p-4 rounded-xl ${item.color || 'bg-white/10'} border border-white/10 text-center`}>
                 <p className="text-[8px] font-black uppercase opacity-60 mb-2 tracking-widest">{item.label}</p>
                 <input 
                   type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} 
                   value={item.value} 
                   readOnly={item.readOnly}
                   onChange={(e) => updateAttendance(item.field, e.target.value)}
                   className={`w-full bg-transparent text-center text-2xl font-black outline-none ${item.readOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-text focus:bg-white/5 rounded-lg'}`} />
              </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Earnings Ledger */}
         <div className="bg-white rounded-xl p-2 md:p-4 md:p-8 border border-gray-100 shadow-xs space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
               <IndianRupee size={14} className="text-emerald-500" /> Auto-Generated Earnings
            </h3>
            
            <div className="space-y-4">
               {[
                 { label: 'Basic Salary (50%)', field: 'basic' },
                 { label: 'HRA (20%)', field: 'hra' },
                 { label: 'Special Allowance', field: 'specialAllowance' },
                 { label: 'Bonus / Incentive', field: 'bonus', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
                 { label: 'Salary Arrears', field: 'salaryArrears' },
               ].map(comp => (
                 <div key={comp.field} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">{comp.label}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-gray-300">₹</span>
                       <input 
                         type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} 
                         value={formData[comp.field] || 0} 
                         onChange={(e) => updateManualField(comp.field, e.target.value)}
                         className={`w-32 text-right px-4 py-2 rounded-lg text-sm font-black outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 ${comp.color || 'bg-gray-50 text-gray-900 border border-transparent focus:bg-white focus:border-emerald-100'}`} />
                    </div>
                 </div>
               ))}
               <div className="pt-6 border-t border-dashed border-gray-100 flex justify-between items-center italic">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Gross Manifest Total</span>
                  <span className="text-xl font-black text-gray-900 font-mono">₹{formData.grossEarning.toLocaleString()}</span>
               </div>
            </div>
         </div>

         {/* Deductions Ledger */}
         <div className="bg-white rounded-xl p-2 md:p-4 md:p-8 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="space-y-6">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Zap size={14} className="text-rose-500" /> Mandatory Deductions
               </h3>
               
               <div className="space-y-4">
                  {[
                    { label: 'Provident Fund (PF)', field: 'pf' },
                    { label: 'Employee State Ins. (ESI)', field: 'esi' },
                    { label: 'Professional Tax (PT)', field: 'professionalTax' },
                    { label: 'Income Tax (TDS)', field: 'tds', color: 'bg-rose-50 border border-rose-100' },
                    { label: 'Advance Recovery', field: 'salaryAdvance', color: 'bg-rose-50 border border-rose-100' },
                  ].map(comp => (
                   <div key={comp.field} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">{comp.label}</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-gray-300">₹</span>
                         <input 
                           type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} 
                           value={formData[comp.field] || 0} 
                           onChange={(e) => updateManualField(comp.field, e.target.value)}
                           className={`w-32 text-right px-4 py-2 rounded-lg text-sm font-black outline-none transition-all focus:ring-2 focus:ring-rose-500/10 ${comp.color || 'bg-gray-50 text-rose-600 border border-transparent focus:bg-white focus:border-rose-100'}`} />
                      </div>
                   </div>
                  ))}
               </div>
            </div>

            <div className="mt-8 p-3 md:p-6 bg-gray-900 rounded-xl text-white shadow-lg overflow-hidden relative">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
               <div className="flex items-center justify-between mb-2 relative z-10">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Net Payable Resolution</p>
                  <p className="text-3xl font-black italic text-emerald-400 font-mono">₹{formData.netSalary.toLocaleString()}</p>
               </div>
               <div className="flex items-center justify-between border-t border-white/5 pt-4 relative z-10">
                  <div>
                    <p className="text-[8px] font-black uppercase opacity-40 mb-1">Settlement Mode</p>
                     <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData((prev: any) => ({...prev, paymentMethod: e.target.value}))}
                        className="bg-transparent text-[11px] font-black uppercase outline-none text-emerald-400 cursor-pointer">
                       <option value="bank_transfer" className="text-black">Wire Transfer</option>
                       <option value="cash" className="text-black">Physical Cash</option>
                       <option value="cheque" className="text-black">Bank Cheque</option>
                     </select>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black uppercase opacity-40 mb-1">Contractual CTC</p>
                     <p className="text-xs font-black">₹{staff?.baseSalary?.toLocaleString() || '0'}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
      <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em] italic py-6">Institutional Ledger Controller v4.1</p>
    </div>
  );
}
