import React from 'react';
import { Pill, AlertTriangle, CheckCircle } from 'lucide-react';
import { MedicineEntry } from './PrescriptionTable';

interface PrescriptionSummaryProps {
  medicines: MedicineEntry[];
  patientAllergies?: string;
}

export const PrescriptionSummary: React.FC<PrescriptionSummaryProps> = ({ medicines, patientAllergies }) => {
  const duplicateCount = medicines.filter(m => m.isDuplicate).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border-theme p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <Pill size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Medicines</p>
          <p className="text-xl font-black text-foreground">{medicines.length}</p>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 flex flex-col justify-center ${patientAllergies ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/20' : 'bg-gray-50 border-gray-100 dark:bg-gray-900/50 dark:border-gray-800'}`}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className={patientAllergies ? 'text-rose-500' : 'text-muted-foreground'} />
          <p className={`text-[10px] font-bold uppercase tracking-widest ${patientAllergies ? 'text-rose-700' : 'text-muted-foreground'}`}>Patient Allergies</p>
        </div>
        <p className={`text-xs font-bold ${patientAllergies ? 'text-rose-600' : 'text-muted-foreground'}`}>
          {patientAllergies || 'No known allergies recorded'}
        </p>
      </div>

      <div className={`rounded-2xl border p-4 flex items-center gap-4 ${duplicateCount > 0 ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${duplicateCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {duplicateCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
        </div>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${duplicateCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>System Check</p>
          <p className={`text-xs font-bold ${duplicateCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {duplicateCount > 0 ? `${duplicateCount} duplicate medicine(s) detected` : 'No interactions found'}
          </p>
        </div>
      </div>
    </div>
  );
};
