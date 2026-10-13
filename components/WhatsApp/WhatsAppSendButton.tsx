import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { useWhatsAppSender } from './useWhatsAppSender';
import { MessageCircle, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const READ_MORE = String.fromCharCode(8206).repeat(4001);
export const WA_DIVIDER = '━━━━━━━━━━━━━━━━━━';

export interface WhatsAppAppointmentDetails {
  patientName?: string;
  mrn?: string;
  appointmentId?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  timeSlot?: string;
  hospitalName?: string;
  fee?: number | string;
  paymentStatus?: string;
}

export interface WhatsAppSendButtonHandle {
  send: () => Promise<boolean>;
  isSending: boolean;
}

interface WhatsAppSendButtonProps {
  hospitalId: string;
  targetRef: React.RefObject<HTMLElement | null>;
  phoneNumber: string;
  documentName?: string;
  caption?: string;
  appointmentDetails?: WhatsAppAppointmentDetails;
  className?: string;
  containerClassName?: string;
  layout?: 'inline' | 'stacked' | 'auto';
  showCheckbox?: boolean;
  autoSend?: boolean;
  onAutoSendChange?: (enabled: boolean) => void;
  triggerSend?: boolean;
  onSendingChange?: (isSending: boolean) => void;
}

export const WhatsAppSendButton = React.forwardRef<WhatsAppSendButtonHandle, WhatsAppSendButtonProps>(({
  hospitalId,
  targetRef,
  phoneNumber,
  documentName = 'Document.pdf',
  caption,
  appointmentDetails,
  className = '',
  containerClassName = '',
  layout = 'auto',
  showCheckbox = true,
  autoSend: propAutoSend,
  onAutoSendChange,
  triggerSend,
  onSendingChange,
}, ref) => {
  const { captureAndSend, isSending } = useWhatsAppSender({ hospitalId });
  
  // Auto WhatsApp State
  const [internalAutoSend, setInternalAutoSend] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('msc_auto_whatsapp') === 'true';
    }
    return false;
  });

  const autoSend = propAutoSend !== undefined ? propAutoSend : internalAutoSend;
  
  const hasAutoSent = useRef(false);
  const prevTriggerRef = useRef(false);

  useEffect(() => {
    if (onSendingChange) {
      onSendingChange(isSending);
    }
  }, [isSending, onSendingChange]);

  // Validate Phone
  const isValidPhone = (phone: string) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    const num = clean.length === 12 && clean.startsWith('91') ? clean.slice(2) : clean;
    return num.length === 10;
  };

  useImperativeHandle(ref, () => ({
    send: async () => {
      return await handleSend();
    },
    isSending,
  }));

  const handleToggleAuto = () => {
    const newValue = !autoSend;
    if (onAutoSendChange) {
      onAutoSendChange(newValue);
    } else {
      setInternalAutoSend(newValue);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('msc_auto_whatsapp', String(newValue));
    }
    toast.success(`Auto WhatsApp is now ${newValue ? 'ON' : 'OFF'}`);
  };

  const buildFinalCaption = () => {
    if (caption && caption !== 'Here is your document.') return caption;
    if (appointmentDetails) {
      const pName = appointmentDetails.patientName || 'Valued Patient';
      const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
      const getValidMrn = (val?: any) => (val && typeof val === 'string' && !isMongoId(val)) ? val : null;

      const idStr = getValidMrn(appointmentDetails.mrn) || appointmentDetails.appointmentId || 'N/A';
      const docName = appointmentDetails.doctorName ? (appointmentDetails.doctorName.startsWith('Dr.') ? appointmentDetails.doctorName : `Dr. ${appointmentDetails.doctorName}`) : 'Attending Specialist';
      const spec = appointmentDetails.specialty || 'General Consultation';
      const hospName = appointmentDetails.hospitalName || 'MsCurechain Healthcare';
      const dateStr = appointmentDetails.date || 'Scheduled Date';
      const timeStr = appointmentDetails.timeSlot || 'Scheduled Time';
      const feeStr = appointmentDetails.fee !== undefined ? `₹${appointmentDetails.fee}` : 'Paid';
      const statusStr = appointmentDetails.paymentStatus || 'Confirmed';

      return `*${hospName.toUpperCase()}*
${WA_DIVIDER}
*APPOINTMENT CONFIRMATION & RECEIPT*

*Patient Name:* ${pName}
*MRN / Token ID:* ${idStr}
*Doctor Name:* ${docName}
*Specialty:* ${spec}
*Appointment Date:* ${dateStr}
*Time Slot:* ${timeStr}
*Consultation Fee:* ${feeStr} (${statusStr.toUpperCase()})
${WA_DIVIDER}
${READ_MORE}
*Important Patient Instructions:*
• Please arrive 15 minutes before your scheduled appointment time.
• Show this token / e-receipt at the Front Desk upon arrival.
• Bring all previous medical records, prescriptions, and lab reports.
• Contact ${hospName} Helpdesk for any queries or rescheduling.

Thank you for choosing ${hospName}. Stay Healthy.`;
    }
    return 'Hello, please find your document attached.';
  };

  const [isSent, setIsSent] = useState(false);

  const handleSend = async (): Promise<boolean> => {
    if (!isValidPhone(phoneNumber)) {
      toast.error('Invalid patient phone number. Must be 10 digits.');
      return false;
    }
    const finalCaption = buildFinalCaption();
    const success = await captureAndSend(targetRef, phoneNumber, documentName, finalCaption);
    if (success) {
      setIsSent(true);
      setTimeout(() => setIsSent(false), 2500);
    } else {
      setIsSent(false);
    }
    return !!success;
  };

  // Trigger send externally (e.g. after confirm button clicked)
  useEffect(() => {
    if (triggerSend && !prevTriggerRef.current) {
      prevTriggerRef.current = true;
      handleSend();
    } else if (!triggerSend) {
      prevTriggerRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSend]);

  const isValid = isValidPhone(phoneNumber);

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col gap-3 w-full ${containerClassName}`}>
        {showCheckbox && (
          <label className="flex items-center gap-2 px-3 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 rounded-xl border border-slate-200 dark:border-gray-600 cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 transition-all select-none w-full shadow-sm">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={handleToggleAuto}
              className="cursor-pointer w-4 h-4 accent-[#25D366]"
            />
            <span>Auto WhatsApp</span>
          </label>
        )}
        
        <button
          onClick={handleSend}
          disabled={isSending || !isValid}
          title={!isValid ? "Invalid phone number" : "Send to WhatsApp"}
          className={`w-full flex items-center justify-center gap-2 p-3.5 md:p-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-[0.98] shadow-md shadow-[#25D366]/10 disabled:opacity-50 ${className} ${!isValid ? '!opacity-50 !cursor-not-allowed !bg-slate-400 !border-slate-400 hover:!bg-slate-400' : ''}`}
        >
          {isSending ? (
            <>
              <Loader2 size={18} className="animate-spin text-white" />
              <span className="animate-pulse">Sending...</span>
            </>
          ) : isSent ? (
            <>
              <Check size={18} className="text-white" />
              <span>Sent</span>
            </>
          ) : (
            <>
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={containerClassName || 'inline-flex items-center gap-2'}>
      {showCheckbox && (
        <label className="shrink-0 flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 rounded-xl border border-slate-200 dark:border-gray-600 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 transition-all select-none whitespace-nowrap shadow-sm">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={handleToggleAuto}
            className="cursor-pointer w-3.5 h-3.5 accent-[#25D366]"
          />
          <span>Auto WhatsApp</span>
        </label>
      )}
      
      <button
        onClick={handleSend}
        disabled={isSending || !isValid}
        title={!isValid ? "Invalid phone number" : "Send to WhatsApp"}
        className={`${className.includes('w-full') || className.includes('flex-1') ? 'flex-1 min-w-0' : 'shrink-0'} flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold uppercase text-[10px] md:text-xs tracking-wider transition-all active:scale-[0.98] shadow-md shadow-[#25D366]/10 disabled:opacity-50 whitespace-nowrap ${className} ${!isValid ? '!opacity-50 !cursor-not-allowed !bg-slate-400 !border-slate-400 hover:!bg-slate-400' : ''}`}
      >
        {isSending ? (
          <>
            <Loader2 size={15} className="animate-spin text-white" />
            <span className="animate-pulse">Sending...</span>
          </>
        ) : isSent ? (
          <>
            <Check size={15} className="text-white" />
            <span>Sent</span>
          </>
        ) : (
          <>
            <MessageCircle size={15} />
            <span>WhatsApp</span>
          </>
        )}
      </button>
    </div>
  );
});

WhatsAppSendButton.displayName = 'WhatsAppSendButton';
