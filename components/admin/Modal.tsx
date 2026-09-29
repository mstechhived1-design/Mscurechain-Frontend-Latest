import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  height?: string;
  padding?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = "max-w-md",
  height = "max-h-[90vh]",
  padding = "p-6 md:p-8"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-3xl border w-full ${maxWidth} ${height} ${padding} shadow-2xl shadow-black/20 flex flex-col relative overflow-hidden`}
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="text-lg md:text-xl font-black italic tracking-tight" style={{ color: 'var(--text-color)' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-all text-gray-400"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "success";
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  loading = false
}) => {
  if (!isOpen) return null;

  const buttonColor = type === "danger" ? "bg-red-600 hover:bg-red-700" :
    type === "warning" ? "bg-yellow-600 hover:bg-yellow-700" :
      type === "success" ? "bg-green-600 hover:bg-green-700" :
        "bg-blue-600 hover:bg-blue-700";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} height="max-h-[300px]" padding="p-6">
      <p className="mb-6 text-sm" style={{ color: 'var(--text-color)' }}>
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--secondary-color)' }}
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-white ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};
