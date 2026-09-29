import React, { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { generateClinicalReceiptHtml, generateOPDRegistrationSlipHtml } from "@/lib/print-utils";
import { renderToStaticMarkup } from "react-dom/server";
import MainHeader from "../printers/MainHeader";
import MainFooter from "../printers/MainFooter";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { sanitizePatientName } from "@/lib/utils/name-utils";
import { usePrintStore } from "@/stores/printStore";

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
    symptoms?: string;
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
    method: 'cash' | 'card' | 'upi' | string;
    mode?: string;
    status: string;
    receiptNumber?: string;
    receiptNo?: string;
    date?: string;
    paymentDetails?: any;
  };
  onClose: () => void;
  onConfirm?: () => Promise<void>;
}

function ClinicalReceipt({ hospital: propHospital, patient, appointment, payment, onClose, onConfirm }: ReceiptProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hospital, setHospital] = React.useState(propHospital);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const { printWithHeader, setPrintWithHeader } = usePrintStore();

  const isOPDOrReg = !((patient.dischargeType && patient.dischargeType.toUpperCase() !== 'NONE') ||
    (appointment.type && (appointment.type.toUpperCase().includes('DISCHARGE') || appointment.type.toUpperCase().includes('SETTLEMENT'))) ||
    (appointment.specialization && appointment.specialization.toUpperCase().includes('DISCHARGE')) ||
    (appointment.specialization?.toUpperCase().includes('IPD') || appointment.type?.toUpperCase().includes('IPD') || appointment.stayDuration));

  const [receiptFormat, setReceiptFormat] = React.useState<'opd_slip' | 'detailed_bill'>(isOPDOrReg ? 'opd_slip' : 'detailed_bill');
  const [shouldPrintAfterUpdate, setShouldPrintAfterUpdate] = React.useState(false);
  const [showGuardianDetails, setShowGuardianDetails] = React.useState(true);

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
        const mappedPatient = {
          ...patient,
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

        const rawHtml = receiptFormat === 'opd_slip'
          ? generateOPDRegistrationSlipHtml({
              hospital,
              patient: mappedPatient,
              appointment,
              payment,
              headerHtml,
              footerHtml,
              showGuardianDetails
            })
          : generateClinicalReceiptHtml({
              forceDetailed: true,
              hospital,
              patient: mappedPatient,
              appointment: {
                ...appointment,
                notes: patient.symptoms || appointment.notes
              },
              payment,
              registrationType: isOPDOrReg ? 'OPD' : (appointment.specialization?.toUpperCase().includes('DISCHARGE') || appointment.type?.toUpperCase().includes('DISCHARGE')) ? 'DISCHARGE' : 'IPD',
              headerHtml,
              footerHtml,
              returnUrl: '#',
              showGuardianDetails
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
              .receipt-container { padding: 5mm !important; }
              .section { page-break-inside: auto !important; }
              .section-header { -webkit-print-color-adjust: exact; }
              tr { page-break-inside: avoid !important; }
              .print-header-spacer { margin-bottom: 0 !important; height: 160px !important; }
              .print-footer-spacer { margin-top: 0 !important; height: 180px !important; }
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
  }, [hospital, patient, appointment, payment, dataLoaded, receiptFormat, printWithHeader, shouldPrintAfterUpdate, isOPDOrReg, showGuardianDetails]);

  const [isConfirming, setIsConfirming] = React.useState(false);

  const handlePrint = async () => {
    if (onConfirm) {
      try {
        setIsConfirming(true);
        await onConfirm();
        setShouldPrintAfterUpdate(true);
      } catch (err) {
        console.error("Confirmation failed", err);
      } finally {
        setIsConfirming(false);
      }
    } else {
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
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={handlePrint}
                disabled={isConfirming}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all text-[11px] sm:text-xs uppercase tracking-wider disabled:opacity-50"
              >
                <Printer size={14} className="sm:size-[16px]" />
                <span>{isConfirming ? '...' : onConfirm ? 'Confirm' : 'Print'}</span>
              </button>
              <button
                onClick={onClose}
                disabled={isConfirming}
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
            style={{ minHeight: '1200px', height: 'auto' }}
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
