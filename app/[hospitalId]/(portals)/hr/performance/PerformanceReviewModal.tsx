"use client";

import React, { useState } from "react";
import { X, Star, Save, Loader2 } from "lucide-react";
import { useSubmitPerformance } from "@/lib/integrations/hooks";
import toast from "react-hot-toast";

interface PerformanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any;
  period: string;
}

export const PerformanceReviewModal: React.FC<PerformanceReviewModalProps> = ({
  isOpen,
  onClose,
  staff,
  period,
}) => {
  const [score, setScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState({
    attendanceRate: 100,
    punctualityScore: 5,
    behaviorScore: 5,
    teamCollaboration: 5,
    technicalSkills: 5,
    patientFeedbackScore: 5,
  });

  const submitMutation = useSubmitPerformance();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({
        user: staff._id || staff.id,
        period,
        score,
        notes,
        metrics,
        status: "completed",
      });
      toast.success("Performance review submitted!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    }
  };

  const updateMetric = (key: string, value: number) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Performance Appraisal</h2>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
              Review for {staff?.name} • {period}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Overall Score */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Rating</label>
            <div className="flex items-center gap-4">
               <div className="flex gap-2">
                 {[1, 2, 3, 4, 5].map((s) => (
                   <button
                     key={s}
                     onClick={() => setScore(s)}
                     className={`p-2 rounded-xl transition-all ${
                       score >= s ? "text-amber-500 bg-amber-50 scale-110" : "text-gray-200 bg-gray-50"
                     }`}
                   >
                     <Star size={24} fill={score >= s ? "currentColor" : "none"} />
                   </button>
                 ))}
               </div>
               <span className="text-2xl font-black text-gray-900">{score}/5</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-6">
             {[
               { label: "Attendance (%)", key: "attendanceRate", max: 100, step: 1 },
               { label: "Punctuality", key: "punctualityScore", max: 5, step: 1 },
               { label: "Behavioral Standard", key: "behaviorScore", max: 5, step: 1 },
               { label: "Collaboration", key: "teamCollaboration", max: 5, step: 1 },
               { label: "Technical Proficiency", key: "technicalSkills", max: 5, step: 1 },
               { label: "Patient Feedback", key: "patientFeedbackScore", max: 5, step: 1 },
             ].map((metric) => (
               <div key={metric.key} className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{metric.label}</label>
                  <input
                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    max={metric.max}
                    value={metrics[metric.key as keyof typeof metrics]}
                    onChange={(e) => updateMetric(metric.key, Number(e.target.value))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500"
                  />
               </div>
             ))}
          </div>

          {/* Detailed Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback & Development Plan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide constructive feedback and specify growth areas..."
              rows={4}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Publish Appraisal
          </button>
        </div>
      </div>
    </div>
  );
};
