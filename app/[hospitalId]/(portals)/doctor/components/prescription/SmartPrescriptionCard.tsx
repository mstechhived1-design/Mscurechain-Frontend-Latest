'use client';

import React, { useState } from 'react';

interface SmartPrescriptionCardProps {
  hospitalId: string;
  appointmentId: string;
  patientId: string;
  patientAllergies?: string;
  onSuccess?: () => void;
}

export const SmartPrescriptionCard: React.FC<SmartPrescriptionCardProps> = () => {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="w-full bg-white dark:bg-[#151515] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-border-theme mb-6 transition-all duration-300">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Clinical Diagnosis (Optional)</label>
            <input 
              type="text" 
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter primary diagnosis..."
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-primary-theme outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Prescription Notes</label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dietary advice, next visit instructions..."
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-primary-theme outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

