import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { sendWhatsAppMedia } from './whatsappApi';

interface UseWhatsAppSenderProps {
  hospitalId: string;
  department?: 'pharma' | 'lab' | 'frontdesk' | 'doctor' | string;
}

export const useWhatsAppSender = ({ hospitalId, department }: UseWhatsAppSenderProps) => {
  const [isSending, setIsSending] = useState(false);

  const captureAndSend = async (
    targetRef: React.RefObject<HTMLElement | null>,
    phoneNumber: string,
    documentName: string = 'Document.pdf',
    caption: string = 'Here is your document.',
    overrideDepartment?: string
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

      // 1. Capture the exact UI using html2canvas
      let tempContainer: HTMLElement | null = null;
      let targetElement: HTMLElement = targetRef.current;
      const A4_WIDTH_PX = 794; // 210mm at 96 DPI
      const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI
      const PAGE_PADDING_X = 32; // ~8.5mm left/right margin matching standard print
      const PAGE_PADDING_TOP = 20; // ~5.5mm top margin
      const PAGE_PADDING_BOTTOM = 24; // ~6.5mm bottom margin
      let dynamicHeight = A4_HEIGHT_PX;

      // If the target is an iframe, clone its content into a temporary host element
      // This completely avoids cross-window/nested iframe hangs in html2canvas!
      if (targetElement.tagName.toLowerCase() === 'iframe') {
        const iframe = targetElement as HTMLIFrameElement;
        const innerDoc = iframe.contentDocument;
        if (innerDoc && innerDoc.body) {
          tempContainer = document.createElement('div');
          tempContainer.style.setProperty('position', 'fixed', 'important');
          tempContainer.style.setProperty('left', '-9999px', 'important');
          tempContainer.style.setProperty('top', '0', 'important');
          tempContainer.style.setProperty('width', `${A4_WIDTH_PX}px`, 'important');
          tempContainer.style.setProperty('background-color', '#ffffff', 'important');
          tempContainer.style.setProperty('z-index', '-9999', 'important');
          tempContainer.style.setProperty('overflow', 'visible', 'important');

          const headStyles = innerDoc.head ? innerDoc.head.innerHTML : '';
          tempContainer.innerHTML = headStyles;

          const hasInnerContainer = !!innerDoc.body.querySelector('.container, .receipt-container, .print-block, .prescription-responsive-container');

          const bodyWrapper = document.createElement('div');
          bodyWrapper.className = innerDoc.body.className;
          bodyWrapper.style.cssText = innerDoc.body.style.cssText;
          bodyWrapper.innerHTML = innerDoc.body.innerHTML;
          bodyWrapper.style.setProperty('position', 'relative', 'important');
          bodyWrapper.style.setProperty('width', `${A4_WIDTH_PX}px`, 'important');
          bodyWrapper.style.setProperty('box-sizing', 'border-box', 'important');
          bodyWrapper.style.setProperty('background-color', '#ffffff', 'important');
          bodyWrapper.style.setProperty('margin', '0', 'important');
          bodyWrapper.style.setProperty('font-family', "'Helvetica', 'Arial', sans-serif", 'important');
          bodyWrapper.style.setProperty('color', '#000000', 'important');
          
          if (hasInnerContainer) {
            // Container already has its own balanced margins; don't add extra wrapper padding that causes page overflow
            bodyWrapper.style.setProperty('padding', '0', 'important');
          } else {
            bodyWrapper.style.setProperty('padding', `${PAGE_PADDING_TOP}px ${PAGE_PADDING_X}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_X}px`, 'important');
          }
          tempContainer.appendChild(bodyWrapper);

          document.body.appendChild(tempContainer);

          // Normalize inner containers so left and right margins are completely balanced (12mm each)
          tempContainer.querySelectorAll<HTMLElement>('.container, .receipt-container, .print-block, .prescription-responsive-container').forEach(el => {
            el.style.setProperty('padding-left', '12mm', 'important');
            el.style.setProperty('padding-right', '12mm', 'important');
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
          });

          // Crucial fix: convert all fixed footers inside tempContainer to position: absolute pinned to bottom with exact equal margins
          const footers = tempContainer.querySelectorAll<HTMLElement>('.footer-wrapper, .hospital-footer, footer, [class*="footer-wrapper"]');
          footers.forEach(f => {
            f.style.setProperty('position', 'absolute', 'important');
            f.style.setProperty('bottom', `${PAGE_PADDING_BOTTOM}px`, 'important');
            const footerMargin = hasInnerContainer ? '12mm' : `${PAGE_PADDING_X}px`;
            f.style.setProperty('left', footerMargin, 'important');
            f.style.setProperty('right', footerMargin, 'important');
            f.style.setProperty('width', hasInnerContainer ? 'calc(100% - 24mm)' : `calc(100% - ${PAGE_PADDING_X * 2}px)`, 'important');
            f.style.setProperty('padding-left', '0', 'important');
            f.style.setProperty('padding-right', '0', 'important');
            f.style.setProperty('display', 'block', 'important');
            f.style.setProperty('visibility', 'visible', 'important');
            f.style.setProperty('z-index', '1000', 'important');
            f.style.setProperty('background', '#ffffff', 'important');
            f.style.setProperty('box-sizing', 'border-box', 'important');
          });

          // Ensure any images inside tempContainer are loaded before measuring/rendering
          const imgs = Array.from(tempContainer.querySelectorAll('img'));
          if (imgs.length > 0) {
            await Promise.all(
              imgs.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                  img.onload = resolve;
                  img.onerror = resolve;
                  setTimeout(resolve, 600);
                });
              })
            );
          }

          // Measure height: calculate exact A4 page multiple with 40px tolerance to prevent blank 2nd page
          const measuredHeight = bodyWrapper.scrollHeight || bodyWrapper.offsetHeight || A4_HEIGHT_PX;
          const pageCount = Math.max(1, Math.ceil((measuredHeight - 40) / A4_HEIGHT_PX));
          dynamicHeight = pageCount * A4_HEIGHT_PX;

          tempContainer.style.setProperty('height', `${dynamicHeight}px`, 'important');
          tempContainer.style.setProperty('min-height', `${dynamicHeight}px`, 'important');
          bodyWrapper.style.setProperty('height', `${dynamicHeight}px`, 'important');
          bodyWrapper.style.setProperty('min-height', `${dynamicHeight}px`, 'important');

          targetElement = tempContainer;
        }
      } else {
        // Direct DOM element (div / printable component)
        const imgs = Array.from(targetElement.querySelectorAll('img'));
        if (imgs.length > 0) {
          await Promise.all(
            imgs.map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 600);
              });
            })
          );
        }
      }

      // Fast native capture in main DOM context with 2x high-resolution retina print quality
      const captureScale = 2;
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(targetElement, {
          scale: captureScale,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: targetElement === tempContainer ? A4_WIDTH_PX : Math.max(A4_WIDTH_PX, targetElement.scrollWidth || 0),
          height: targetElement === tempContainer ? dynamicHeight : (targetElement.scrollHeight || undefined),
          windowWidth: Math.max(A4_WIDTH_PX, targetElement.scrollWidth || 0),
          windowHeight: targetElement === tempContainer ? dynamicHeight : (targetElement.scrollHeight || undefined),
          onclone: (_clonedDoc: Document, clonedElement: HTMLElement) => {
            // 1. Convert any fixed footers to absolute bottom with standard equal margins
            const clonedHasInner = !!clonedElement.querySelector('.container, .receipt-container, .print-block, .prescription-responsive-container, .print-content, #printable-bill, .report-body');
            const clonedMargin = clonedHasInner ? '12mm' : `${PAGE_PADDING_X}px`;
            const clonedWidth = clonedHasInner ? 'calc(100% - 24mm)' : `calc(100% - ${PAGE_PADDING_X * 2}px)`;

            // Enforce standard A4 width on cloned element if capturing a printable container directly
            if (clonedElement.querySelector('#printable-bill, .print-content, .lab-report-template') || clonedElement.id === 'printable-bill') {
              clonedElement.style.setProperty('width', `${A4_WIDTH_PX}px`, 'important');
              clonedElement.style.setProperty('min-width', `${A4_WIDTH_PX}px`, 'important');
              clonedElement.style.setProperty('max-width', `${A4_WIDTH_PX}px`, 'important');
              clonedElement.style.setProperty('box-sizing', 'border-box', 'important');
            }

            // Normalize lab/report containers so left and right margins are completely balanced
            clonedElement.querySelectorAll<HTMLElement>('.print-content, #printable-bill, .report-body, .lab-report-template, .bill-preview-body').forEach(el => {
              el.style.setProperty('width', '100%', 'important');
              el.style.setProperty('max-width', '100%', 'important');
              el.style.setProperty('box-sizing', 'border-box', 'important');
            });

            const clonedFooters = clonedElement.querySelectorAll<HTMLElement>('.footer-wrapper, .hospital-footer, footer, [class*="footer-wrapper"]');
            clonedFooters.forEach(f => {
              const comp = window.getComputedStyle(f);
              if (comp.position === 'fixed' || f.style.position === 'absolute') {
                f.style.setProperty('position', 'absolute', 'important');
                f.style.setProperty('bottom', `${PAGE_PADDING_BOTTOM}px`, 'important');
                f.style.setProperty('left', clonedMargin, 'important');
                f.style.setProperty('right', clonedMargin, 'important');
                f.style.setProperty('width', clonedWidth, 'important');
                f.style.setProperty('padding-left', '0', 'important');
                f.style.setProperty('padding-right', '0', 'important');
              }
              f.style.setProperty('display', 'block', 'important');
              f.style.setProperty('visibility', 'visible', 'important');
            });

            // 2. Helper to completely strip CSS Color 4 functions (lab, oklab, lch, oklch, color, color-mix)
            //    Uses balanced-parenthesis matching to handle nested functions like color-mix(in oklch, oklch(...), ...)
            const sanitizeCssColors = (cssText: string): string => {
              if (!cssText) return '';
              // Match color function names then consume balanced parentheses (handles nesting)
              const colorFnPattern = /\b(?:oklab|oklch|lab|lch|color-mix|color)\s*\(/gi;
              let result = '';
              let lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = colorFnPattern.exec(cssText)) !== null) {
                result += cssText.slice(lastIndex, match.index);
                // Walk forward from the opening '(' counting depth
                let depth = 1;
                let i = match.index + match[0].length;
                while (i < cssText.length && depth > 0) {
                  if (cssText[i] === '(') depth++;
                  else if (cssText[i] === ')') depth--;
                  i++;
                }
                result += '#000000';
                lastIndex = i;
                colorFnPattern.lastIndex = i; // resume after consumed function
              }
              result += cssText.slice(lastIndex);
              return result;
            };

            // 3. Remove external stylesheet links from cloned document to prevent html2canvas from loading un-sanitized CSS Color 4
            _clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());

            // 4. Inline and sanitize parent stylesheets for non-iframe targets
            if (targetElement !== tempContainer) {
              try {
                Array.from(document.styleSheets).forEach((sheet) => {
                  try {
                    if (sheet.cssRules) {
                      const rulesText = Array.from(sheet.cssRules)
                        .map((r) => r.cssText)
                        .join('\n');
                      const styleEl = _clonedDoc.createElement('style');
                      styleEl.textContent = sanitizeCssColors(rulesText);
                      _clonedDoc.head.appendChild(styleEl);
                    }
                  } catch {}
                });
              } catch (e) {
                console.warn('[WhatsApp Sender] Stylesheet inlining error:', e);
              }
            }

            // 5. Sanitize all <style> tags in the cloned document
            _clonedDoc.querySelectorAll('style').forEach(el => {
              if (el.textContent && /(?:oklab|oklch|lab|lch|color)/i.test(el.textContent)) {
                el.textContent = sanitizeCssColors(el.textContent);
              }
            });

            // 6. Sanitize any inline styles on cloned elements
            clonedElement.querySelectorAll<HTMLElement>('*').forEach(el => {
              const styleAttr = el.getAttribute('style');
              if (styleAttr && /(?:oklab|oklch|lab|lch|color)/i.test(styleAttr)) {
                el.setAttribute('style', sanitizeCssColors(styleAttr));
              }
            });
          },
        });
      } finally {
        if (tempContainer && tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
      }

      // 2. Convert canvas to crisp, high-definition standard A4 PDF
      //    Use per-page canvas cropping to avoid alignment bleed and extra blank pages
      const isLandscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight + 15) {
        // Fits on a single A4 page (with generous 15mm tolerance to prevent nearly-blank 2nd page)
        // Use actual proportional height to avoid stretching/distortion
        const fitHeight = Math.min(imgHeight, pdfHeight);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, fitHeight, undefined, 'FAST');
      } else {
        // Multi-page: crop canvas per page for pixel-perfect slicing (no content bleed between pages)
        const pxPerPage = Math.floor((pdfHeight / pdfWidth) * canvas.width);
        const totalPages = Math.ceil(canvas.height / pxPerPage);

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          const srcY = page * pxPerPage;
          const srcH = Math.min(pxPerPage, canvas.height - srcY);

          // Skip nearly-empty trailing pages (less than 2% content)
          if (srcH < pxPerPage * 0.02 && page > 0) break;

          // Create a per-page canvas slice
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = srcH;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          }

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const pageImgH = (srcH * pdfWidth) / canvas.width;
          pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pageImgH, undefined, 'FAST');
        }
      }

      const pdfBase64 = pdf.output('datauristring');

      toast.loading('Sending via WhatsApp...', { id: 'whatsapp-send' });

      // 3. Send to the unified WhatsApp gateway
      const res = await sendWhatsAppMedia(hospitalId, {
        phone: phoneNumber,
        pdfBase64,
        fileName: documentName,
        caption,
        department: overrideDepartment || department,
      });

      if (!res || res.success === false) {
        throw new Error(res?.error || res?.message || 'Failed to send WhatsApp message.');
      }

      toast.success('Receipt sent to WhatsApp successfully!', { id: 'whatsapp-send', duration: 4000 });
      return true;
    } catch (error: any) {
      console.error('[WhatsApp Sender] Error:', error);
      const errorMsg =
        error?.error?.error ||
        error?.data?.error ||
        error?.error?.message ||
        error?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        (error?.message && error.message !== 'HTTP 500' ? error.message : null) ||
        'Failed to deliver WhatsApp message. Please check if hospital WhatsApp bot is connected.';
      toast.error(`WhatsApp Notice: ${errorMsg}`, { id: 'whatsapp-send', duration: 7000 });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { captureAndSend, isSending };
};
