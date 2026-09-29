'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ClinicalNotesData {
  chiefComplaints: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  clinicalFindings: string;
  assessment: string;
  plan: string;
}

interface ClinicalNotesEditorProps {
  initialData?: Partial<ClinicalNotesData>;
  onSave: (data: ClinicalNotesData) => Promise<void>;
}

export const ClinicalNotesEditor: React.FC<ClinicalNotesEditorProps> = ({ initialData, onSave }) => {
  const { register, handleSubmit, watch, formState: { isDirty } } = useForm<ClinicalNotesData>({
    defaultValues: {
      chiefComplaints: initialData?.chiefComplaints || '',
      historyOfPresentIllness: initialData?.historyOfPresentIllness || '',
      pastMedicalHistory: initialData?.pastMedicalHistory || '',
      familyHistory: initialData?.familyHistory || '',
      clinicalFindings: initialData?.clinicalFindings || '',
      assessment: initialData?.assessment || '',
      plan: initialData?.plan || '',
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save logic (debounced)
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave(watch() as ClinicalNotesData);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save failed", error);
      } finally {
        setIsSaving(false);
      }
    }, 10000); // 10s debounce for auto-save

    return () => clearTimeout(timer);
  }, [watch(), isDirty, onSave]);

  const onSubmit = async (data: ClinicalNotesData) => {
    try {
      setIsSaving(true);
      await onSave(data);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  const textareaClasses = "w-full p-3 bg-gray-50 dark:bg-gray-900 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-primary-theme outline-none min-h-[100px] resize-y";

  return (
    <div className="w-full bg-white dark:bg-[#151515] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-border-theme mb-6">
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <BookOpen className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">CLINICAL NOTES</h2>
            <p className="text-indigo-100 text-xs font-medium tracking-wide uppercase mt-0.5">Structured SOAP Format</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs font-medium text-white/70 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Chief Complaints (CC)</label>
              <textarea 
                {...register('chiefComplaints')}
                placeholder="e.g., Fever and cough for 3 days"
                className={textareaClasses}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">History of Present Illness (HPI)</label>
              <textarea 
                {...register('historyOfPresentIllness')}
                placeholder="Detailed progression of symptoms..."
                className={textareaClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Past Medical History (PMH)</label>
              <textarea 
                {...register('pastMedicalHistory')}
                placeholder="Known conditions, past surgeries..."
                className={textareaClasses}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Family History</label>
              <textarea 
                {...register('familyHistory')}
                placeholder="Relevant hereditary conditions..."
                className={textareaClasses}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Clinical Findings (O/E)</label>
            <textarea 
              {...register('clinicalFindings')}
              placeholder="Vitals, physical examination results..."
              className={textareaClasses}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Assessment / Diagnosis</label>
              <textarea 
                {...register('assessment')}
                placeholder="Provisional or final diagnosis..."
                className={textareaClasses}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Plan</label>
              <textarea 
                {...register('plan')}
                placeholder="Diagnostic tests, referrals, instructions..."
                className={textareaClasses}
              />
            </div>
          </div>
        </form>

        <div className="mt-6 flex items-center gap-2 text-muted-foreground bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-border-theme">
          <AlertCircle size={14} className="text-indigo-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Notes auto-save every 10 seconds. Try typing "/" for smart templates (coming soon).</span>
        </div>
      </div>
    </div>
  );
};
