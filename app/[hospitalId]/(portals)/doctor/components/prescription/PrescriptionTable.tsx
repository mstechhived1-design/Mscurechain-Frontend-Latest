import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface MedicineEntry {
  id: string;
  name: string;
  productId?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  foodTiming: string;
  notes: string;
  isDuplicate?: boolean;
  stockStatus?: string;
}

interface PrescriptionTableProps {
  medicines: MedicineEntry[];
  updateMedicine: (id: string, field: keyof MedicineEntry, value: string) => void;
  removeMedicine: (id: string) => void;
}

const DOSAGE_OPTIONS = ['100mg', '250mg', '500mg', '650mg', '1g', '5ml', '10ml', 'Drop', 'Custom'];
const FREQUENCY_OPTIONS = ['OD (Once a day)', 'BD (Twice a day)', 'TID (Thrice a day)', 'QID (Four times)', 'SOS (As needed)', 'Morning', 'Night'];
const DURATION_OPTIONS = ['1 Day', '3 Days', '5 Days', '7 Days', '10 Days', '15 Days', '30 Days', 'Until Finished'];
const FOOD_TIMING_OPTIONS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach', 'Anytime'];

export const PrescriptionTable: React.FC<PrescriptionTableProps> = ({ medicines, updateMedicine, removeMedicine }) => {
  if (medicines.length === 0) {
    return (
      <div className="py-8 text-center border-2 border-dashed border-border-theme rounded-2xl bg-gray-50 dark:bg-gray-900/50">
        <p className="text-sm font-bold text-muted-foreground">No medicines added yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Search and select a medicine from the input above.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border-theme">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            <th className="p-3 w-1/4">Medicine Name</th>
            <th className="p-3 w-1/8">Dosage</th>
            <th className="p-3 w-1/6">Frequency</th>
            <th className="p-3 w-1/8">Duration</th>
            <th className="p-3 w-1/12">Qty</th>
            <th className="p-3 w-1/6">Food/Notes</th>
            <th className="p-3 w-12 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-theme">
          {medicines.map((med) => (
            <tr key={med.id} className={`bg-white dark:bg-gray-950 transition-colors ${med.isDuplicate ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'}`}>
              <td className="p-3 align-top">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-foreground">{med.name}</span>
                  {med.stockStatus && (
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${med.stockStatus.toLowerCase().includes('out') || med.stockStatus.toLowerCase().includes('not') ? 'text-red-500' : med.stockStatus.toLowerCase().includes('low') ? 'text-amber-500' : 'text-teal-500'}`}>
                      {med.stockStatus}
                    </span>
                  )}
                  {med.isDuplicate && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded w-fit uppercase tracking-widest mt-1">
                      <AlertTriangle size={10} /> Duplicate
                    </span>
                  )}
                </div>
              </td>
              <td className="p-3 align-top">
                <select
                  value={med.dosage}
                  onChange={(e) => updateMedicine(med.id, 'dosage', e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary-theme outline-none"
                >
                  {DOSAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </td>
              <td className="p-3 align-top">
                <select
                  value={med.frequency}
                  onChange={(e) => updateMedicine(med.id, 'frequency', e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary-theme outline-none"
                >
                  {FREQUENCY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </td>
              <td className="p-3 align-top">
                <select
                  value={med.duration}
                  onChange={(e) => updateMedicine(med.id, 'duration', e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary-theme outline-none"
                >
                  {DURATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </td>
              <td className="p-3 align-top">
                <input
                  type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                  value={med.quantity}
                  onChange={(e) => updateMedicine(med.id, 'quantity', e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary-theme outline-none"
                />
              </td>
              <td className="p-3 align-top space-y-2">
                <select
                  value={med.foodTiming}
                  onChange={(e) => updateMedicine(med.id, 'foodTiming', e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-theme outline-none"
                >
                  {FOOD_TIMING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input
                  type="text"
                  value={med.notes}
                  onChange={(e) => updateMedicine(med.id, 'notes', e.target.value)}
                  placeholder="Additional instructions..."
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs focus:ring-1 focus:ring-primary-theme outline-none"
                />
              </td>
              <td className="p-3 align-top text-center">
                <button
                  onClick={() => removeMedicine(med.id)}
                  className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors mx-auto"
                  title="Remove Medicine"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
