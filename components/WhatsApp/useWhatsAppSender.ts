import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { sendWhatsAppMedia } from './whatsappApi';

interface UseWhatsAppSenderProps {
  hospitalId: string;
}

export const useWhatsAppSender = ({ hospitalId }: UseWhatsAppSenderProps) => {
  const [isSending, setIsSending] = useState(false);

  const captureAndSend = async (
    targetRef: React.RefObject<HTMLElement | null>,
    phoneNumber: string,
    documentName: string = 'Document.pdf',
    caption: string = 'Here is your document.'
  ) => {
    if (!targetRef.current) {
      toast.error('Could not find the document to capture.');
      return false;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Invalid patient phone number.');
      return false;
    }

    try {
      setIsSending(true);
      toast.loading('Generating PDF...', { id: 'whatsapp-send' });

      // 1. Capture the exact UI using html2canvas (Zero UI rewrite magic)
      let targetElement: HTMLElement = targetRef.current;
      
      // If the target is an iframe, capture its body instead
      if (targetElement.tagName.toLowerCase() === 'iframe') {
        const iframe = targetElement as HTMLIFrameElement;
        if (iframe.contentDocument && iframe.contentDocument.body) {
          targetElement = iframe.contentDocument.body;
        }
      }

      const canvas = await html2canvas(targetElement, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          try {
            // 1. Override getComputedStyle on the cloned iframe window only (leaves main window 100% untouched)
            const win = clonedDoc.defaultView;
            if (win) {
              const origGetComputedStyle = win.getComputedStyle;
              win.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
                const style = origGetComputedStyle.call(win, elt, pseudoElt);
                if (!style) return style;
                return new Proxy(style, {
                  get(target, prop) {
                    const val = (target as any)[prop];
                    if (typeof val === 'string' && /(?:lab|oklch|oklab|color)\(/i.test(val)) {
                      return 'rgba(0, 0, 0, 0)';
                    }
                    if (typeof val === 'function') {
                      return function (...args: any[]) {
                        const res = val.apply(target, args);
                        if (typeof res === 'string' && /(?:lab|oklch|oklab|color)\(/i.test(res)) {
                          return 'rgba(0, 0, 0, 0)';
                        }
                        return res;
                      };
                    }
                    return val;
                  },
                });
              };
            }

            // 2. Sanitize style tags inside clonedDoc
            const styleTags = clonedDoc.querySelectorAll('style');
            styleTags.forEach((style) => {
              if (style.textContent && /(?:lab|oklch|oklab|color)\(/i.test(style.textContent)) {
                style.textContent = style.textContent.replace(
                  /(?:lab|oklch|oklab|color)\([^)]+\)/gi,
                  'rgba(0, 0, 0, 0)'
                );
              }
            });

            // 3. Delete rules containing lab/oklch/oklab from clonedDoc stylesheets
            Array.from(clonedDoc.styleSheets).forEach((sheet) => {
              try {
                const rules = sheet.cssRules;
                if (!rules) return;
                for (let i = rules.length - 1; i >= 0; i--) {
                  const rule = rules[i];
                  if (rule.cssText && /(?:lab|oklch|oklab)\(/i.test(rule.cssText)) {
                    sheet.deleteRule(i);
                  }
                }
              } catch (e) {
                // Ignore cross-origin stylesheet errors
              }
            });

            // 4. Sanitize inline style attributes on elements inside clonedDoc
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                const cssText = htmlEl.getAttribute('style');
                if (cssText && /(?:lab|oklch|oklab|color)\(/i.test(cssText)) {
                  htmlEl.setAttribute(
                    'style',
                    cssText.replace(/(?:lab|oklch|oklab|color)\([^)]+\)/gi, 'rgba(0, 0, 0, 0)')
                  );
                }
              }
            });
          } catch (e) {
            console.warn('[WhatsApp Sender] Error in onclone style sanitization:', e);
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');

      // 2. Convert to PDF
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const pdfBase64 = pdf.output('datauristring');

      toast.loading('Sending via WhatsApp...', { id: 'whatsapp-send' });

      // 3. Send to the unified WhatsApp gateway
      await sendWhatsAppMedia(hospitalId, {
        phone: phoneNumber,
        pdfBase64,
        fileName: documentName,
        caption,
      });

      toast.success('Sent to WhatsApp successfully!', { id: 'whatsapp-send' });
      return true;
    } catch (error: any) {
      console.error('[WhatsApp Sender] Error:', error);
      toast.error(error?.response?.data?.error || 'Failed to send WhatsApp message.', { id: 'whatsapp-send' });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { captureAndSend, isSending };
};
