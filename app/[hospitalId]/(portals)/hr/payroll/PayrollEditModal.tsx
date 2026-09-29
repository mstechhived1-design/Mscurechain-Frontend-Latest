"use client";

import React, { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface PayrollEditModalProps {
  payroll: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

export const PayrollEditModal: React.FC<PayrollEditModalProps> = ({ payroll, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    baseSalary: payroll.baseSalary || 0,
    totalAllowances: payroll.totalAllowances || 0,
    totalDeductions: payroll.totalDeductions || 0,
    netSalary: payroll.netSalary || 0,
    presentDays: payroll.presentDays || 0,
    absentDays: payroll.absentDays || 0,
    leaveDays: payroll.leaveDays || 0,
    attendanceDays: payroll.attendanceDays || 0,
    notes: payroll.notes || ""
  });

  const monthDays = payroll.monthDays || 30;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newData = { ...prev, [name]: name === 'notes' ? value : Number(value) };
        
        // Auto-calculate net salary if salary components change
        if (['baseSalary', 'totalAllowances', 'totalDeductions', 'absentDays'].includes(name)) {
            const dayRate = newData.baseSalary / monthDays;
            const penalty = newData.absentDays * dayRate;
            newData.netSalary = Math.max(0, Math.round((newData.baseSalary - penalty) + newData.totalAllowances - newData.totalDeductions));
        }

        // Auto-calculate attendance days if presence changes
        if (['presentDays', 'leaveDays'].includes(name)) {
            // Include weeklyOffDays from original record if not editable
            const weeklyOffDays = (payroll.weeklyOffDays || 0);
            newData.attendanceDays = newData.presentDays + newData.leaveDays + weeklyOffDays;
        }

        return newData;
    });
  };

  const handleFullPresent = () => {
    setFormData(prev => ({
        ...prev,
        presentDays: monthDays - (payroll.weeklyOffDays || 0) - (payroll.leaveDays || 0),
        absentDays: 0,
        attendanceDays: monthDays,
        netSalary: Math.round(prev.baseSalary + prev.totalAllowances - prev.totalDeductions)
    }));
    toast.success("Reset to full presence");
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="shrink-0 px-2 md:px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Edit Payroll: {payroll.user?.name}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Base Salary</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="baseSalary" value={formData.baseSalary} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Net Payable</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="netSalary" value={formData.netSalary} onChange={handleChange}
                className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-sm font-black text-emerald-600 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Present Units</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="presentDays" value={formData.presentDays} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Leave Units</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="leaveDays" value={formData.leaveDays} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Absent Units</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="absentDays" value={formData.absentDays} onChange={handleChange}
                className="w-full px-3 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg text-sm font-bold text-rose-600 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Total Allowances</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="totalAllowances" value={formData.totalAllowances} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Total Deductions</label>
              <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="totalDeductions" value={formData.totalDeductions} onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm font-bold text-rose-600 focus:ring-2 focus:ring-rose-500/10 outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Administrative Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-500/10 transition-all" />
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-xl">
             <AlertCircle size={16} className="text-amber-600" />
             <p className="text-[10px] font-medium text-amber-600 uppercase tracking-tight">Manual edits override automatic calculations based on attendance logs.</p>
          </div>
        </div>

        <div className="shrink-0 px-2 md:px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <button onClick={handleFullPresent} className="px-5 py-2 whitespace-nowrap bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 shadow-xs">
            Full Presence
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">
              Cancel
            </button>
            <button onClick={() => onSave(formData)} className="px-8 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              Save Resolution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
