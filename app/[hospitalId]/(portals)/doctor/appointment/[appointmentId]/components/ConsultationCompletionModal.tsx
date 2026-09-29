"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConsultationCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  missingPrescription?: boolean;
  missingLabs?: boolean;
}

export default function ConsultationCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  missingPrescription = false,
  missingLabs = false
}: ConsultationCompletionModalProps) {
  const getMissingText = () => {
    if (missingPrescription && missingLabs) return <>any <span className="text-amber-600 font-semibold">Prescription</span> or <span className="text-purple-600 font-semibold">Lab Tests</span></>;
    if (missingPrescription) return <>any <span className="text-amber-600 font-semibold">Prescription</span></>;
    if (missingLabs) return <>any <span className="text-purple-600 font-semibold">Lab Tests</span></>;
    return "these additions";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800 transition-all overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertCircle size={18} />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Confirm Completion
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Doctor, you are completing the session without adding {getMissingText()}.
                </p>
                <p className="text-xs font-semibold text-muted-foreground bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  Do you really want to complete the consultation without these additions?
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                No, Go Back
              </button>
              <button
                onClick={onConfirm}
                className="rounded-lg px-4 py-2 text-sm font-black text-white bg-primary-theme hover:bg-primary-theme/90 focus:outline-none focus:ring-2 focus:ring-primary-theme focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center gap-2 transition-all shadow-md"
              >
                <CheckCircle2 size={16} />
                Yes, Finish
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
