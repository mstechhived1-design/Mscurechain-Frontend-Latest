'use client';

import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import { format } from 'date-fns';

interface MedicineEntry {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
}

interface PrescriptionPreviewProps {
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorRegistrationNo?: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientId: string;
  date: Date;
  diagnosis: string;
  clinicalNotes: string;
  medicines: MedicineEntry[];
  plan: string;
  onClose: () => void;
}

export const PrescriptionPreview: React.FC<PrescriptionPreviewProps> = ({
  hospitalName,
  hospitalAddress = '123 Health Ave, Medical District',
  hospitalPhone = '+1 234 567 8900',
  doctorName,
  doctorSpecialty = 'General Practitioner',
  doctorRegistrationNo = 'REG-12345',
  patientName,
  patientAge,
  patientGender,
  patientId,
  date,
  diagnosis,
  clinicalNotes,
  medicines,
  plan,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 print:p-0 print:bg-white print:block">
      {/* Non-printable overlay controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 print:hidden z-10">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          <Printer size={18} />
          Print Prescription
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-white text-gray-700 hover:bg-gray-100 rounded-xl shadow-lg transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Printable Area - styled exactly like a real prescription pad */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-2xl relative print:shadow-none print:w-full print:max-w-none print:m-0 overflow-y-auto max-h-[90vh] print:max-h-none print:overflow-visible flex flex-col">
        {/* Header - Hospital / Clinic Info */}
        <div className="border-b-2 border-gray-800 p-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-widest">{hospitalName}</h1>
            <p className="text-sm font-medium text-gray-600 mt-1">{hospitalAddress}</p>
            <p className="text-sm font-medium text-gray-600">{hospitalPhone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">{doctorName}</h2>
            <p className="text-sm font-medium text-gray-600">{doctorSpecialty}</p>
            <p className="text-sm font-medium text-gray-500">Reg. No: {doctorRegistrationNo}</p>
          </div>
        </div>

        {/* Patient Details */}
        <div className="bg-gray-50 p-6 flex flex-wrap gap-x-8 gap-y-4 border-b border-gray-200">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Patient Name</span>
            <span className="text-sm font-black text-gray-900">{patientName}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Age / Gender</span>
            <span className="text-sm font-black text-gray-900">{patientAge} Yrs / {patientGender}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Patient ID</span>
            <span className="text-sm font-black text-gray-900 uppercase">{patientId}</span>
          </div>
          <div className="flex flex-col ml-auto">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</span>
            <span className="text-sm font-black text-gray-900">{format(date, 'dd MMM yyyy')}</span>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Left Sidebar (Clinical info) */}
          <div className="w-1/3 border-r border-gray-200 p-6 space-y-6">
            {clinicalNotes && (
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Clinical Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{clinicalNotes}</p>
              </div>
            )}
            
            {diagnosis && (
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Diagnosis</h3>
                <p className="text-sm font-bold text-gray-900 whitespace-pre-wrap">{diagnosis}</p>
              </div>
            )}

            {plan && (
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-3">Plan / Advice</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{plan}</p>
              </div>
            )}
          </div>

          {/* Right Main Area (Rx) */}
          <div className="w-2/3 p-6 flex flex-col">
            <div className="text-4xl font-serif font-black text-gray-300 mb-6 select-none">Rx</div>
            
            <div className="space-y-6 flex-1">
              {medicines.map((med, index) => (
                <div key={index} className="border-b border-dashed border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 flex items-baseline gap-2">
                        <span>{index + 1}.</span>
                        <span className="uppercase">{med.name}</span>
                        <span className="text-sm font-medium text-gray-500 lowercase">({med.dosage})</span>
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 ml-5">
                        <span className="font-semibold text-gray-800">{med.frequency}</span> • {med.instructions}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Duration</span>
                      <span className="text-sm font-black text-gray-900">{med.duration}</span>
                      <div className="text-[10px] text-gray-400 mt-1">Qty: {med.quantity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-200 text-right">
              <div className="inline-block border-t border-gray-400 pt-2 w-48 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                Doctor's Signature
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-4 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Generated via MSCureChain EMR Workstation • Valid for {medicines.length > 0 ? medicines[0].duration : '1 week'}
          </p>
        </div>
      </div>
      
      {/* Custom print styles to ensure layout stays fixed during print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
};
