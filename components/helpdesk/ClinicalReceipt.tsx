import React, { useEffect, useRef } from "react";
import { X, Printer, Tag, Percent, Check, Edit2 } from "lucide-react";
import { generateClinicalReceiptHtml, generateOPDRegistrationSlipHtml, generateLabReceiptHtml, formatReceiptPaymentMode } from "@/lib/print-utils";
import { renderToStaticMarkup } from "react-dom/server";
import MainHeader from "../printers/MainHeader";
import MainFooter from "../printers/MainFooter";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { sanitizePatientName, formatPatientNameWithPrefix } from "@/lib/utils/name-utils";
import { usePrintStore } from "@/stores/printStore";
import { WhatsAppSendButton, WhatsAppSendButtonHandle, formatDynamicWhatsAppCaption } from "../WhatsApp/WhatsAppSendButton";
import { useParams } from "next/navigation";

interface ReceiptProps {
  hospital: {
    name: string;
    address?: string;
    contact?: string;
    email?: string;
    logo?: string;
    opdFollowUpDays?: number;
    ipdFollowUpDays?: number;
    enableFollowUpExpiry?: boolean;
  };
  patient: {
    name: string;
    honorific?: string;
    mrn: string;
    age: string | number;
    gender: string;
    mobile: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    bloodGroup?: string;
    guardianName?: string;
    guardianRelation?: string;
    guardianMobile?: string;
    doctorReference?: string;
    dateOfBirth?: string;
    dob?: string;
    allergies?: string;
    medicalHistory?: string;
    symptoms?: string | string[];
    chiefComplaint?: string;
    reason?: string;
    diagnosis?: string;
    provisionalDiagnosis?: string;
    treatmentGiven?: string;
    surgicalProcedures?: string;
    investigationsPerformed?: string;
    hospitalCourse?: string;
    conditionAtDischarge?: string;
    medicationsPrescribed?: string;
    adviceAtDischarge?: string;
    activityRestrictions?: string;
    dietInstructions?: string;
    warningSigns?: string;
    followUpDate?: string;
    dischargeType?: string;
    vitals?: {
      height?: string;
      weight?: string;
      bp?: string;
      bloodPressure?: string;
      pulse?: string;
      temp?: string;
      temperature?: string;
      spo2?: string;
      spO2?: string;
      sugar?: string;
      glucose?: string;
    };
  };
  appointment: {
    doctorName: string;
    specialization?: string;
    degree?: string;
    date: string;
    time: string;
    type: string;
    appointmentId: string;
    honorific?: string;
    appointmentHonorific?: string;
    guardianName?: string;
    guardianRelation?: string;
    guardianMobile?: string;
    doctorReference?: string;
    stayDuration?: string;
    notes?: string;
    symptoms?: string | string[];
    reason?: string;
    chiefComplaint?: string;
    tests?: any[];
    testName?: string;
    appointmentDate?: string;
    bookedAt?: string;
    createdAt?: string;
  };
  payment: {
    amount: number;
    fee?: number;
    totalBillAmount?: number;
    originalAmount?: number;
    discount?: number;
    discountAmount?: number;
    discountType?: string;
    discountValue?: number;
    totalPaidAmount?: number;
    paidAmount?: number;
    advanceAmount?: number;
    remainingPaid?: number;
    balance?: number;
    dueAmount?: number;
    grandTotal?: number;
    settlementAmount?: number;
    receipts?: any[];
    payments?: any[];
    isDischarge?: boolean;
    isDischargeTransaction?: boolean;
    method: 'cash' | 'card' | 'upi' | string;
    mode?: string;
    status: string;
    receiptNumber?: string;
    receiptNo?: string;
    date?: string;
    createdAt?: string;
    paymentDetails?: any;
  };
  isLab?: boolean;
  labTests?: any[];
  onClose: () => void;
  onConfirm?: () => Promise<void>;
  isBooking?: boolean;
}

function ClinicalReceipt({ hospital: propHospital, patient, appointment, payment, isLab: propIsLab, labTests: propLabTests, onClose, onConfirm, isBooking }: ReceiptProps) {
  const isBookingMode = Boolean(onConfirm || isBooking);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hospital, setHospital] = React.useState(propHospital);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const { printWithHeader, setPrintWithHeader } = usePrintStore();
  const params = useParams();
  const getHospitalIdFromPath = () => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/([a-f0-9]{24})\b/i);
      if (match) return match[1];
    }
    return '';
  };
  const hospitalId = (params?.hospitalId as string) || (propHospital as any)?._id || (propHospital as any)?.id || (propHospital as any)?.hospitalId || getHospitalIdFromPath() || '';

  const isLab = Boolean(
    propIsLab ||
    appointment.type?.toLowerCase() === 'lab' ||
    appointment.type?.toLowerCase() === 'lab_test' ||
    appointment.type?.toLowerCase().includes('lab') ||
    appointment.specialization?.toLowerCase().includes('lab') ||
    patient.dischargeType === 'LAB'
  );

  const isOPDOrReg = !isLab && !((patient.dischargeType && patient.dischargeType.toUpperCase() !== 'NONE') ||
    (appointment.type && (appointment.type.toUpperCase().includes('DISCHARGE') || appointment.type.toUpperCase().includes('SETTLEMENT'))) ||
    (appointment.specialization && appointment.specialization.toUpperCase().includes('DISCHARGE')) ||
    (appointment.specialization?.toUpperCase().includes('IPD') || appointment.type?.toUpperCase().includes('IPD') || appointment.stayDuration));

  const [receiptFormat, setReceiptFormat] = React.useState<'opd_slip' | 'detailed_bill' | 'lab_receipt'>(
    isLab ? 'lab_receipt' : isOPDOrReg ? 'opd_slip' : 'detailed_bill'
  );
  const [shouldPrintAfterUpdate, setShouldPrintAfterUpdate] = React.useState(false);
  const [showGuardianDetails, setShowGuardianDetails] = React.useState(true);
  
  // Manual discount / waiver adjustment before printing
  const initialDiscount = Number(
    payment.discount ||
    (payment as any).discountAmount ||
    (payment as any).discountDetails?.amount ||
    (appointment as any).discount ||
    (appointment as any).discountAmount ||
    (appointment as any).discountDetails?.amount ||
    0
  );
  const [customDiscount, setCustomDiscount] = React.useState<number>(initialDiscount);
  const [isEditingDiscount, setIsEditingDiscount] = React.useState(false);

  // Determine if any guardian/reference data exists to show the toggle
  const hasGuardianData = !!(appointment.guardianName || appointment.guardianRelation || appointment.guardianMobile || appointment.doctorReference || patient.guardianName || patient.guardianRelation || patient.guardianMobile || patient.doctorReference);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TOGGLE_HEADER_FOOTER') {
        setPrintWithHeader(event.data.checked);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setPrintWithHeader]);

  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        const response = await hospitalAdminService.getHospital();
        if (response?.hospital) {
          const h = response.hospital as any;
          setHospital({
            name: h.name || propHospital.name,
            address: h.address || propHospital.address,
            contact: h.phone || propHospital.contact,
            email: h.email || propHospital.email,
            logo: h.logo || propHospital.logo,
            opdFollowUpDays: h.opdFollowUpDays ?? propHospital.opdFollowUpDays,
            ipdFollowUpDays: h.ipdFollowUpDays ?? propHospital.ipdFollowUpDays,
            enableFollowUpExpiry: h.enableFollowUpExpiry ?? propHospital.enableFollowUpExpiry
          });
        }
      } catch (error) {
        console.error("Failed to fetch admin hospital details for receipt", error);
      } finally {
        setDataLoaded(true);
      }
    };
    fetchAdminDetails();
  }, [propHospital]);

  useEffect(() => {
    if (dataLoaded && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // Map props to match generateClinicalReceiptHtml expectations
        const pAny = patient as any;
        const aAny = appointment as any;
        const payAny = payment as any;
        const mrnCandidates = [
          pAny?.mrn,
          pAny?.mrnNumber,
          pAny?.medicalRecordNumber,
          pAny?.patientId,
          pAny?.uhid,
          pAny?.user?.mrn,
          pAny?.user?.patientId,
          aAny?.mrn,
          aAny?.patientDetails?.mrn,
          aAny?.patientMrn,
          payAny?.mrn,
          payAny?.patientMrn,
          payAny?.referenceNode,
          payAny?.referenceId,
          aAny?.referenceNode
        ];
        const resolvedPatientMrn = mrnCandidates.find(c => c && typeof c === 'string' && c.trim() !== '' && c.trim() !== 'N/A' && c.trim() !== 'Resolving...' && c.trim() !== '-' && !c.includes('undefined')) || (patient.mrn && patient.mrn !== 'Resolving...' ? patient.mrn : "N/A");

        const mappedPatient = {
          ...patient,
          mrn: resolvedPatientMrn,
          name: sanitizePatientName(patient.name),
          dob: patient.dateOfBirth || patient.dob, // crucial mapping
          vitals: patient.vitals ? {
            ...patient.vitals,
            temperature: patient.vitals.temperature || patient.vitals.temp,
            temp: patient.vitals.temp || patient.vitals.temperature,
            bloodPressure: patient.vitals.bp || patient.vitals.bloodPressure,
            bp: patient.vitals.bp || patient.vitals.bloodPressure,
            sugar: patient.vitals.sugar || patient.vitals.glucose,
            glucose: patient.vitals.glucose || patient.vitals.sugar,
            pulse: patient.vitals.pulse,
            spO2: patient.vitals.spo2 || patient.vitals.spO2,
            spo2: patient.vitals.spo2 || patient.vitals.spO2,
          } : undefined
        };

        // 1. Render React Components to Static HTML
        const headerHtml = renderToStaticMarkup(
          <MainHeader initialDetails={{
            name: hospital.name,
            logo: hospital.logo,
            address: hospital.address || "",
            phone: hospital.contact || "",
            email: hospital.email || "",
          }} />
        );

        const footerHtml = renderToStaticMarkup(
          <MainFooter initialDetails={{
            name: hospital.name,
            address: hospital.address || "",
            phone: hospital.contact || "",
            email: hospital.email || "",
          }} />
        );

        // Calculate dynamic adjusted payment with customDiscount applied
        const totalBillCalc = Number(payment.totalBillAmount || payment.grandTotal || (Number(payment.amount || 0) + Number(payment.advanceAmount || 0)));
        const advanceAmountCalc = Number(payment.advanceAmount || 0);
        const effectiveDiscount = Number(customDiscount || 0);
        const afterDiscountCalc = Math.max(0, totalBillCalc - effectiveDiscount);
        
        let settlementPaidCalc = Number(payment.remainingPaid || payment.settlementAmount || payment.amount || 0);
        if (payment.isDischarge && settlementPaidCalc === 0 && afterDiscountCalc > advanceAmountCalc) {
          settlementPaidCalc = Math.max(0, afterDiscountCalc - advanceAmountCalc);
        }
        const totalPaidCalc = Number(payment.totalPaidAmount || (advanceAmountCalc + settlementPaidCalc));
        const newBalanceCalc = Math.max(0, afterDiscountCalc - totalPaidCalc);

        const resolvedDate = payment.date || appointment.date || (appointment as any).bookedAt || (payment as any).createdAt || (appointment as any).createdAt || new Date();

        const mappedPayment = {
          ...payment,
          date: resolvedDate,
          discount: effectiveDiscount,
          totalPaidAmount: totalPaidCalc,
          paidAmount: totalPaidCalc,
          remainingPaid: settlementPaidCalc,
          settlementAmount: settlementPaidCalc,
          balance: newBalanceCalc,
          dueAmount: newBalanceCalc,
        };

        const mappedAppointment = {
          ...appointment,
          date: resolvedDate,
          discount: effectiveDiscount,
          notes: patient.symptoms || appointment.notes,
        };

        const rawHtml = isLab || receiptFormat === 'lab_receipt'
          ? generateLabReceiptHtml({
              hospital,
              patient: mappedPatient,
              appointment: mappedAppointment,
              payment: mappedPayment,
              headerHtml,
              footerHtml,
              labTests: propLabTests || appointment.tests || [],
              showGuardianDetails,
              printWithHeader
            })
          : receiptFormat === 'opd_slip'
          ? generateOPDRegistrationSlipHtml({
              hospital,
              patient: mappedPatient,
              appointment: mappedAppointment,
              payment: mappedPayment,
              registrationType: (payment.isDischarge || payment.isDischargeTransaction || appointment.specialization?.toUpperCase().includes('DISCHARGE') || appointment.type?.toUpperCase().includes('DISCHARGE') || appointment.type?.toUpperCase().includes('SETTLEMENT') || (patient.dischargeType && patient.dischargeType.toUpperCase() !== 'NONE')) ? 'DISCHARGE' : isOPDOrReg ? 'OPD' : 'IPD',
              headerHtml,
              footerHtml,
              showGuardianDetails,
              printWithHeader
            })
          : generateClinicalReceiptHtml({
              forceDetailed: true,
              hospital,
              patient: mappedPatient,
              appointment: mappedAppointment,
              payment: mappedPayment,
              registrationType: (payment.isDischarge || payment.isDischargeTransaction || appointment.specialization?.toUpperCase().includes('DISCHARGE') || appointment.type?.toUpperCase().includes('DISCHARGE') || appointment.type?.toUpperCase().includes('SETTLEMENT') || (patient.dischargeType && patient.dischargeType.toUpperCase() !== 'NONE')) ? 'DISCHARGE' : isOPDOrReg ? 'OPD' : 'IPD',
              headerHtml,
              footerHtml,
              returnUrl: '#',
              showGuardianDetails,
              printWithHeader
            });

        // 2. Sanitize for iframe preview - thorough removal of navigation and print triggers
        const sanitizedHtml = rawHtml
          .replace(/onload="window.print\(\);"/gi, '')
          .replace(/<script>[\s\S]*?<\/script>/gi, '');

        // 3. Inject responsive styles for preview only
        const docWithStyles = sanitizedHtml.replace('</head>', `
          <style>
            /* Critical resets for preview */
            html, body { 
              overflow: visible !important; 
              height: auto !important;
              background: #fff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            /* Hide navigational junk */
            ::-webkit-scrollbar { display: none !important; }
            * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
            .no-print, .return-btn, .print-settings-toggle-wrapper { display: none !important; visibility: hidden !important; height: 0 !important; padding: 0 !important; }
            
            .receipt-container { 
              min-height: auto !important; 
              padding: 12px !important;
              width: 100% !important;
              box-sizing: border-box !important;
              display: block !important;
              background: #fff !important;
            }
            
            .print-header-spacer {
              margin-bottom: 0 !important;
              height: 10px !important;
            }
            .print-footer-spacer {
              margin-top: 0 !important;
              height: 10px !important;
            }
            
            table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; }
            .data-grid td { word-break: break-all !important; padding: 6px 10px !important; }
            .bill-title { font-size: clamp(16px, 4vw, 22px) !important; margin-bottom: 5px !important; }
            .hospital-name { font-size: clamp(18px, 5vw, 32px) !important; }
            .section { margin-bottom: 20px !important; width: 100% !important; }
            .section-header { font-size: 11px !important; padding-bottom: 4px !important; border-bottom: 2px solid #334155 !important; }
            
            /* Print specific fixes */
            @media print {
              .receipt-container { padding: 0 5mm !important; }
              .section { page-break-inside: auto !important; }
              .section-header { -webkit-print-color-adjust: exact; }
              .print-table { width: 100% !important; page-break-inside: auto !important; }
              .print-table > tbody > tr { page-break-inside: auto !important; }
              .print-table > tbody > tr > td { page-break-inside: auto !important; }
              .data-grid tr, .payment-table tr, .vitals-grid tr { page-break-inside: avoid !important; }
              ${receiptFormat === 'detailed_bill' ? `
              .header-wrapper { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; background: white !important; z-index: 1000 !important; }
              .footer-wrapper { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; background: white !important; z-index: 1000 !important; }
              .print-header-spacer { margin-bottom: 0 !important; height: 135px !important; }
              .print-footer-spacer { margin-top: 0 !important; height: 125px !important; }
              ` : `
              .header-wrapper { position: relative !important; top: auto !important; left: auto !important; right: auto !important; width: 100% !important; page-break-inside: avoid !important; }
              .footer-wrapper { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; padding: 0 5mm !important; box-sizing: border-box !important; background: white !important; z-index: 1000 !important; page-break-inside: avoid !important; }
              .print-header-spacer, .print-footer-spacer, .footer-spacer { display: none !important; height: 0 !important; }
              `}
            }
          </style>
        </head>`);

        const docWithScript = docWithStyles + `
          <script>
            (() => {
              const cb = document.querySelector('input[type="checkbox"]');
              if (cb) {
                cb.checked = ${printWithHeader};
              }
              document.addEventListener('change', (e) => {
                if (e.target && e.target.type === 'checkbox') {
                  window.parent.postMessage({ type: 'TOGGLE_HEADER_FOOTER', checked: e.target.checked }, '*');
                }
              });
            })();
          </script>
        `;

        doc.open();
        doc.write(docWithScript);
        doc.close();

        // Adjust iframe height to content to prevent huge blank void in modal preview
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentDocument) {
            const scrollH = iframeRef.current.contentDocument.body.scrollHeight;
            if (scrollH > 100) {
              iframeRef.current.style.height = `${scrollH + 20}px`;
            }
          }
        }, 150);

        if (shouldPrintAfterUpdate) {
            setShouldPrintAfterUpdate(false);
            setTimeout(() => {
                if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.print();
                }
            }, 500);
        }
      }
    }
  }, [hospital, patient, appointment, payment, dataLoaded, receiptFormat, printWithHeader, shouldPrintAfterUpdate, isOPDOrReg, showGuardianDetails, customDiscount]);

  const whatsAppButtonRef = React.useRef<WhatsAppSendButtonHandle>(null);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [triggerWhatsApp, setTriggerWhatsApp] = React.useState(false);
  const [isWhatsAppSending, setIsWhatsAppSending] = React.useState(false);
  const [autoWhatsApp, setAutoWhatsApp] = React.useState(() => {
    // Strictly only enable auto WhatsApp when booking a new appointment (never in history / reprint)
    if (!isBookingMode) return false;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('msc_auto_whatsapp') === 'true';
    }
    return false;
  });

  const handleToggleAutoWhatsApp = (val: boolean) => {
    setAutoWhatsApp(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('msc_auto_whatsapp', String(val));
    }
  };

  const handlePrint = async () => {
    if (onConfirm) {
      try {
        setIsConfirming(true);
        if (autoWhatsApp && whatsAppButtonRef.current && patient.mobile) {
          try {
            await whatsAppButtonRef.current.send();
          } catch (e) {
            console.warn("[Auto WhatsApp] Receipt send error:", e);
          }
        }
        await onConfirm();
        setShouldPrintAfterUpdate(true);
      } catch (err) {
        console.error("Confirmation failed", err);
      } finally {
        setIsConfirming(false);
      }
    } else {
      // Re-print / History mode: ONLY print to paper. NEVER trigger WhatsApp automatically!
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">

      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[210mm] sm:max-w-4xl h-[92vh] flex flex-col overflow-hidden relative border border-slate-200">

        {/* Header Actions */}
        <div className="flex flex-col gap-3 p-2.5 sm:p-4 border-b border-slate-100 bg-white z-10 shrink-0">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-teal-600 shrink-0" />
                <span className="hidden sm:inline text-sm font-bold text-slate-500 uppercase tracking-widest">Print Manager</span>
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                {isLab ? (
                  <>
                    <button
                      onClick={() => setReceiptFormat('lab_receipt')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${receiptFormat === 'lab_receipt' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      🔬 Lab Receipt
                    </button>
                    <button
                      onClick={() => setReceiptFormat('detailed_bill')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${receiptFormat === 'detailed_bill' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      📑 Detailed Bill
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setReceiptFormat('opd_slip')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${receiptFormat === 'opd_slip' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      📜 Old Receipt
                    </button>
                    <button
                      onClick={() => setReceiptFormat('detailed_bill')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${receiptFormat === 'detailed_bill' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      📑 Detailed Bill
                    </button>
                  </>
                )}
              </div>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all select-none">
                <input
                  type="checkbox"
                  checked={printWithHeader}
                  onChange={(e) => setPrintWithHeader(e.target.checked)}
                  className="cursor-pointer w-3.5 h-3.5 accent-teal-600"
                />
                <span>Header & Footer</span>
              </label>

              {/* Auto WhatsApp Toggle in Toolbar - strictly only visible during appointment booking */}
              {isBookingMode && (
                <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={autoWhatsApp}
                    onChange={(e) => handleToggleAutoWhatsApp(e.target.checked)}
                    className="cursor-pointer w-3.5 h-3.5 accent-[#25D366]"
                  />
                  <span className={autoWhatsApp ? 'text-teal-700 font-black' : ''}>Auto WhatsApp</span>
                </label>
              )}

              {hasGuardianData && (
                <button
                  onClick={() => setShowGuardianDetails(prev => !prev)}
                  title={showGuardianDetails ? 'Hide Guardian / Reference Details from receipt' : 'Show Guardian / Reference Details on receipt'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                    showGuardianDetails
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-6 h-3.5 rounded-full relative inline-flex items-center transition-colors ${
                    showGuardianDetails ? 'bg-blue-500' : 'bg-slate-300'
                  }`}>
                    <span className={`absolute w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${
                      showGuardianDetails ? 'translate-x-3' : 'translate-x-0.5'
                    }`} />
                  </span>
                  <span>Guardian Info</span>
                </button>
              )}

              {/* Discount / Balance Waiver Controls */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10px] font-bold">
                <Tag size={13} className="text-amber-600" />
                <span className="text-amber-800 uppercase tracking-wider font-extrabold hidden sm:inline">Discount:</span>
                <div className="relative flex items-center">
                  <span className="absolute left-1.5 text-slate-500 font-bold text-[10px]">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customDiscount === 0 ? '' : customDiscount}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setCustomDiscount(val);
                    }}
                    className="w-20 pl-4 pr-1 py-0.5 text-xs font-black text-slate-800 bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
                  />
                </div>
                {/* Quick Waive Balance Button */}
                {(() => {
                  const billTot = Number(payment.totalBillAmount || payment.grandTotal || (Number(payment.amount || 0) + Number(payment.advanceAmount || 0)));
                  const adv = Number(payment.advanceAmount || 0);
                  const rem = Number(payment.remainingPaid || payment.settlementAmount || payment.amount || 0);
                  const paid = Number(payment.totalPaidAmount || (adv + rem));
                  const outstanding = Math.max(0, billTot - paid);
                  if (outstanding > 0 && customDiscount < outstanding) {
                    return (
                      <button
                        type="button"
                        onClick={() => setCustomDiscount(outstanding)}
                        title={`Waive remaining ₹${outstanding.toLocaleString('en-IN')} as discount`}
                        className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-all shadow-sm"
                      >
                        Waive Balance (₹{outstanding.toLocaleString('en-IN')})
                      </button>
                    );
                  }
                  if (customDiscount > 0) {
                    return (
                      <button
                        type="button"
                        onClick={() => setCustomDiscount(0)}
                        title="Reset discount to 0"
                        className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider transition-all"
                      >
                        Clear
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {(() => {
                  const testsSummary = ((propLabTests && propLabTests.length > 0)
                    ? propLabTests.map((t: any) => t.name || t.testName || t.investigationName).filter(Boolean).join(', ')
                    : (appointment.notes || (appointment.specialization?.toLowerCase() !== 'lab' && appointment.specialization?.toLowerCase() !== 'lab_test' ? appointment.specialization : '') || 'Lab Diagnostics')) || 'Lab Diagnostics';

                  const fullPatientName = formatPatientNameWithPrefix(
                    patient.name,
                    appointment.appointmentHonorific || appointment.honorific || (appointment as any).patientDetails?.honorific || patient.honorific || (patient as any).profile?.honorific,
                    false
                  );

                  const labWhatsAppCaption = formatDynamicWhatsAppCaption(
                    `*${(hospital.name || 'HOSPITAL').toUpperCase()}*
━━━━━━━━━━━━━━━━━━
🔬 *LAB BILL & RECEIPT*
*Patient:* ${fullPatientName}
*Token / MRN:* ${patient.mrn || appointment.appointmentId || 'N/A'}
*Doctor:* ${appointment.doctorName ? (appointment.doctorName.startsWith('Dr.') ? appointment.doctorName : `Dr. ${appointment.doctorName}`) : 'Dr. Attending Specialist'}
*Service:* Lab Diagnostic (${testsSummary})
*Paid:* ₹${Math.round(payment.amount || 0).toLocaleString('en-IN')} (${(payment.status || 'PAID').toUpperCase()} - ${formatReceiptPaymentMode(payment, appointment)})
━━━━━━━━━━━━━━━━━━`,
                    `📌 *Important Instructions:*
• Present this receipt at laboratory to collect reports.
• Reports verified by pathologist before release.
• Contact ${hospital.name} helpdesk for assistance.

Thank you for choosing ${hospital.name}. Stay Healthy.`
                  );

                  return (
                    <WhatsAppSendButton
                      ref={whatsAppButtonRef}
                      hospitalId={hospitalId}
                      department={isLab ? 'lab' : 'frontdesk'}
                      targetRef={iframeRef}
                      phoneNumber={patient.mobile}
                      documentName={isLab ? `Lab_Receipt_${fullPatientName.replace(/\s+/g, '_')}.pdf` : `Appointment_Receipt_${fullPatientName.replace(/\s+/g, '_')}.pdf`}
                      showCheckbox={false}
                      autoSend={isBookingMode && autoWhatsApp}
                      onAutoSendChange={handleToggleAutoWhatsApp}
                      triggerSend={triggerWhatsApp}
                      onSendingChange={setIsWhatsAppSending}
                      caption={isLab ? labWhatsAppCaption : undefined}
                      appointmentDetails={isLab ? undefined : {
                        patientName: fullPatientName,
                        tokenNo: (appointment as any).token_number || (appointment as any).tokenNo || (appointment as any).tokenNumber || (appointment as any).token || (appointment as any).dailyTokenNumber || (appointment as any).queueNumber,
                        mrn: patient.mrn,
                        appointmentId: appointment.appointmentId,
                        doctorName: appointment.doctorName,
                        specialty: appointment.specialization,
                        date: appointment.date,
                        timeSlot: appointment.time,
                        hospitalName: hospital.name,
                        fee: payment.amount,
                        paymentStatus: payment.status || 'PAID',
                        paymentMode: formatReceiptPaymentMode(payment, appointment),
                      }}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all text-[11px] sm:text-xs uppercase tracking-wider disabled:opacity-50 h-full"
                    />
                  );
                })()}
              <button
                onClick={handlePrint}
                disabled={isConfirming || isWhatsAppSending}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all text-[11px] sm:text-xs uppercase tracking-wider disabled:opacity-50"
              >
                <Printer size={14} className="sm:size-[16px]" />
                <span>{isConfirming ? '...' : onConfirm ? 'Confirm' : 'Print'}</span>
              </button>
              <button
                onClick={onClose}
                disabled={isConfirming || isWhatsAppSending}
                className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg active:scale-95 transition-all disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {onConfirm && (
            <div className="w-full">
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-teal-50/80 text-teal-700 rounded-lg border border-teal-100 w-full shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest text-center">Receipt number generated on confirm</span>
              </div>
            </div>
          )}
        </div>

        {/* Iframe Preview */}
        <div className="flex-1 bg-white p-0 sm:p-4 overflow-x-hidden overflow-y-auto no-scrollbar flex justify-center items-start">
          <iframe
            ref={iframeRef}
            className="bg-white w-full sm:w-[210mm] shrink-0 origin-top transform transition-all duration-300 scale-[1] mb-10 shadow-none border-none"
            style={{ minHeight: '600px', height: 'auto' }}
            title="Receipt Preview"
          />
        </div>

      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
           .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
      `}} />
    </div>
  );
}

export default React.memo(ClinicalReceipt);
