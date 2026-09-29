"use client";

import React, { useState, useEffect, use} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
  Beaker,
  Printer,
  Activity,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { DOCTOR_ENDPOINTS } from '@/lib/integrations/config/endpoints';
import { getAppointmentDetailsAction, getDoctorProfileAction } from '@/lib/integrations/actions/doctor.actions';
import { useQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { useTenantLink } from '@/hooks/useTenantLink';

function CreateLabTokenPage({ params }: { params: Promise<{ hospitalId: string }> }) {
  const resolvedParams = use(params);
  const hospitalIdFromParams = resolvedParams.hospitalId;
  
  // --- Hospital Data ---
  const { data: hospitalDataRaw } = useQuery({
    queryKey: ['hospitalDetails'],
    queryFn: () => hospitalAdminService.getHospital(),
  });
  const hospitalData = hospitalDataRaw?.hospital;
  const { getPath } = useTenantLink();

  const router = useRouter();
  const searchParams = useSearchParams() as any;
  const appointmentId = ((searchParams?.get('appointmentId') ?? null) ?? null);
  const patientId = ((searchParams?.get('patientId') ?? null) ?? null);

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tests, setTests] = useState([
    { name: '', testId: '', category: 'Blood Test', instructions: '', price: 0 }
  ]);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [notes, setNotes] = useState('');

  // Dynamic Data State
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [testCategories, setTestCategories] = useState<string[]>([]);

  // Search State for each row
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [patientData, setPatientData] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [doctorName, setDoctorName] = useState<string>('');
  const [tokenNumber, setTokenNumber] = useState<string>('');

  // Success State
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<{ labToken: string, billing: string } | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (appointmentId) {
      const fetchDetails = async () => {
        const res = await getAppointmentDetailsAction(appointmentId);
        if (res.success && res.data) {
          setPatientData(res.data.patient || res.data.patientDetails);
        }
      };
      fetchDetails();
    } else if (patientId) {
      const fetchPatientDetails = async () => {
        try {
          const res = await doctorService.getPatientDetails(patientId);
          if (res) {
            setPatientData(res);
          }
        } catch (err) {
          console.error("Failed to fetch patient details", err);
          toast.error("Failed to load patient information");
        }
      };
      fetchPatientDetails();
    }
  }, [appointmentId, patientId]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Skip client-side cache to always get fresh populated data
        const profile: any = await apiClient(DOCTOR_ENDPOINTS.PROFILE, { skipCache: true });
        if (profile) {
          setDoctorData(profile);
          // Try all possible name paths — backend returns DoctorProfile with user populated
          const rawName =
            profile?.user?.name ||            // DoctorProfile.user (populated User)
            profile?.name ||                   // direct name field
            '';
          // Strip any existing "Dr." prefix to avoid "Dr. Dr. Name" duplication
          const resolvedName = rawName.replace(/^Dr\.?\s*/i, '').trim();
          console.log('[Lab Token] Doctor profile user:', profile?.user, 'name:', resolvedName);
          setDoctorName(resolvedName);
          return;
        }
      } catch (err) {
        console.warn('Direct profile fetch failed, trying server action:', err);
      }
      // Fallback: server action
      try {
        const res = await getDoctorProfileAction();
        if (res.success && res.data) {
          setDoctorData(res.data);
          const rawFallback = res.data?.user?.name || res.data?.name || '';
          setDoctorName(rawFallback.replace(/^Dr\.?\s*/i, '').trim());
        }
      } catch (err) {
        console.error('Failed to fetch doctor profile:', err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch Lab Tests
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await doctorService.getLabTests();
        if (res) {
          setAvailableTests(res);
          const categories = Array.from(new Set(res.map((t: any) => t.departmentId?.name || t.category || 'General')));
          setTestCategories(categories as string[]);
        }
      } catch (err) {
        console.error("Failed to fetch lab tests", err);
      }
    };
    fetchTests();
  }, []);

  const addTest = () => {
    setTests([...tests, { name: '', testId: '', category: 'Blood Test', instructions: '', price: 0 }]);
  };

  // Handle Test Search
  const handleSearch = (query: string, index: number) => {
    const updated = [...tests];
    updated[index] = { ...updated[index], name: query };
    setTests(updated);

    if (!query) {
      setSearchResults([]);
      return;
    }

    setActiveSearchIndex(index);
    const filtered = availableTests.filter((t: any) =>
      (t.testName || t.name).toLowerCase().includes(query.toLowerCase()) ||
      (t.testCode || '').toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered.slice(0, 10)); // Limit to 10
  };

  const selectTest = (test: any, index: number) => {
    const updated = [...tests];
    updated[index] = {
      name: test.testName || test.name,
      testId: test._id,
      category: test.departmentId?.name || 'General',
      instructions: '',
      price: test.price || 0
    };
    setTests(updated);
    setActiveSearchIndex(null);
    setSearchResults([]);
    calculateBilling(updated);
  };


  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  const updateTest = (index: number, field: string, value: string | number) => {
    const updated = [...tests];
    updated[index] = { ...updated[index], [field]: value };
    setTests(updated);
    if (field === 'price') {
      calculateBilling(updated);
    }
  };

  const calculateBilling = (currentTests = tests) => {
    const sub = currentTests.reduce((sum, test) => sum + (parseFloat(String(test.price)) || 0), 0);
    const taxAmt = 0;
    const tot = sub;
    setSubtotal(sub);
    setTax(taxAmt);
    setTotal(tot);
  };

  const handleSubmit = async () => {
    if (tests.filter(t => t.name.trim()).length === 0) {
      toast.error('Please add at least one test');
      return;
    }

    try {
      setIsSaving(true);
      const res = await doctorService.createLabToken({
        appointmentId,
        patientId,
        tests: tests.filter(t => t.name.trim()).map(t => ({
          name: t.name,
          testId: t.testId, // Pass testId to backend
          category: t.category,
          instructions: t.instructions,
          price: t.price
        })),
        priority,
        notes
      });

      if (res.success) {
        const genTokenNumber = res.labToken?.tokenNumber || `LAB-${Date.now()}`;
        setTokenNumber(genTokenNumber);

        // Calculate billing
        calculateBilling();

        // Helper to get hospital details for printing
        const initialHospitalDetails = {
          name: hospitalData?.name || doctorData?.hospital?.name || 'KADAPA MULTI-SPECIALITY',
          address: hospitalData?.address || doctorData?.hospital?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP',
          phone: hospitalData?.phone || doctorData?.hospital?.phone || '+91 8562 245555',
          email: hospitalData?.email || doctorData?.hospital?.email || 'hospital@example.com',
          logo: hospitalData?.logo || doctorData?.hospital?.logo
        };

        const headerHtml = renderToStaticMarkup(<MainHeader initialDetails={initialHospitalDetails} />);
        const footerHtml = renderToStaticMarkup(<MainFooter initialDetails={initialHospitalDetails} />);

        // Generate Lab Token HTML
        const labTokenHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Lab Token - ${genTokenNumber}</title>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
              @media print {
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; }
              }
              body { 
                font-family: 'Inter', Arial, sans-serif; 
                background: white; 
                margin: 0;
                padding: 0;
              }
              .container {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                padding: 10mm 15mm 10mm 20mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                background: white;
                position: relative;
              }
              .content { 
                flex: 1; 
                display: flex;
                flex-direction: column;
              }
              .print-footer { page-break-inside: avoid; margin-top: auto; }
              .info-grid { page-break-inside: avoid; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #eef2f6; }
              .remarks-box { page-break-inside: avoid; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 20px; border-radius: 0 8px 8px 0; }
              .signature-section { page-break-inside: avoid; margin-top: 30px; text-align: right; }
              .signature-name { font-size: 13px; font-weight: 800; color: #1e293b; margin: 0; }
              .signature-desc { font-size: 10px; color: #64748b; margin: 0; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; table-layout: fixed; }
              th { text-align: left; font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; padding: 12px 10px; border-bottom: 2px solid #f1f5f9; letter-spacing: 0.5px; }
              td { padding: 12px 10px; border-bottom: 1px solid #f8fafc; font-size: 10px; vertical-align: top; word-wrap: break-word; }
              .col-id { width: 35px; }
              .col-desc { width: 40%; }
              .col-cat { width: 25%; }
              .col-instr { width: auto; }
              .test-name { font-weight: 800; color: #1e293b; text-transform: uppercase; line-height: 1.4; }
            </style>
          </head>
          <body>
            <div class="container">
              ${headerHtml}
              <div class="content">
                <div class="title-row">
                  <h1 class="title">Lab Requisition</h1>
                  <div class="token-id">${genTokenNumber}</div>
                </div>
                
                <div style="margin: 20px 0; display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                  <div style="padding: 12px 15px; background: white; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                    <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Patient Name</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase;">${patientData?.personal?.name || patientData?.name || 'N/A'}</div>
                  </div>
                  <div style="padding: 12px 15px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">MRN / UHID</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase;">${patientData?.mrn || patientData?.personal?.mrn || 'N/A'}</div>
                  </div>
                  <div style="padding: 12px 15px; background: #f8fafc; border-right: 1px solid #f1f5f9;">
                    <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Age / Gender</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e293b;">${patientData?.age || patientData?.personal?.age || 'N/A'}Y / ${patientData?.gender || patientData?.personal?.gender || 'N/A'}</div>
                  </div>
                  <div style="padding: 12px 15px; background: white;">
                    <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Applied Path (Priority: ${priority.toUpperCase()})</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e293b;">${new Date().toLocaleDateString('en-GB')} <span style="color: #64748b; font-weight: 700; margin-left: 4px;">${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span></div>
                  </div>
                </div>

                <h3 style="font-size: 10px; font-weight: 800; color: #1e40af; text-transform: uppercase; margin: 20px 0 10px 0;">Requested Investigations</h3>
                <table>
                  <thead>
                    <tr>
                      <th class="col-id">#</th>
                      <th class="col-desc">Investigation Description</th>
                      <th class="col-cat">Category</th>
                      <th class="col-instr">Clinic Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tests.filter(t => t.name.trim()).map((test, idx) => `
                      <tr>
                        <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                        <td class="test-name">${test.name}</td>
                        <td style="color: #64748b; font-weight: 700;">${test.category}</td>
                        <td style="font-style: italic; color: #64748b; font-size: 10px; line-height: 1.4;">${test.instructions || 'Standard Protocol'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                ${notes ? `
                  <div class="remarks-box">
                    <div class="remarks-title">Clinical Remarks / Notes</div>
                    <p class="remarks-text">${notes}</p>
                  </div>
                ` : ''}

                <div class="signature-section">
                   <p class="signature-name">Dr. ${doctorName || doctorData?.user?.name || 'N/A'}</p>
                   <p class="signature-desc">${doctorData?.designation || doctorData?.specialties?.[0] || 'Medical Officer'}</p>
                </div>
              </div>
              ${footerHtml}
            </div>
          </body>
          </html>
        `;

        // Generate Billing HTML
        const billingHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Lab Billing - ${genTokenNumber}</title>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
              @media print {
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; }
              }
              body {
                font-family: 'Inter', Arial, sans-serif; 
                background: white; 
                margin: 0;
                padding: 0;
              }
              .container {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                padding: 10mm 15mm 10mm 20mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                background: white;
              }
              .content { 
                flex: 1; 
                display: flex;
                flex-direction: column;
              }
              .print-footer { page-break-inside: avoid; margin-top: auto; }
              .info-row { page-break-inside: avoid; display: flex; justify-content: space-between; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #eef2f6; }
              .summary-box { page-break-inside: avoid; margin-left: auto; width: 250px; margin-top: 30px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #eef2f6; }
              .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
              .summary-total { border-top: 2px solid #eef2f6; margin-top: 10px; padding-top: 10px; color: #16a34a; font-size: 18px; font-weight: 900; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th { text-align: left; font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; padding: 12px 15px; border-bottom: 2px solid #f1f5f9; letter-spacing: 0.5px; }
              td { padding: 12px 15px; border-bottom: 1px solid #f8fafc; font-size: 11px; vertical-align: middle; }
              .test-name { font-weight: 800; color: #1e293b; text-transform: uppercase; }
              .amount { text-align: right; font-weight: 900; color: #1e293b; }
            </style>
          </head>
          <body>
            <div class="container">
              ${headerHtml}
              <div class="content">
                <h1 class="title">Billing Receipt</h1>
                
                <div style="margin: 20px 0; display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                  <div style="padding: 12px 15px; background: white; border-right: 1px solid #f1f5f9;">
                    <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Bill To</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase;">${patientData?.personal?.name || patientData?.name || 'N/A'}</div>
                    <div style="font-size: 9px; color: #64748b; font-weight: 700;">MRN: ${patientData?.mrn || 'N/A'}</div>
                  </div>
                  <div style="padding: 12px 15px; background: #f8fafc;">
                    <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Billing Metadata</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e293b;">TOKEN: ${genTokenNumber}</div>
                    <div style="font-size: 9px; color: #64748b; font-weight: 700;">${new Date().toLocaleDateString('en-GB')} @ ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="width: 50%;">Investigation Item</th>
                      <th style="width: 30%;">Category</th>
                      <th style="text-align: right; width: 20%;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tests.filter(t => t.name.trim()).map(test => `
                      <tr>
                        <td class="test-name">${test.name}</td>
                        <td style="color: #64748b;">${test.category}</td>
                        <td class="amount">₹${(parseFloat(String(test.price)) || 0).toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <div class="summary-box">
                  <div class="summary-row">
                    <span style="color: #64748b;">Subtotal</span>
                    <span style="font-weight: 700;">₹${subtotal.toFixed(2)}</span>
                  </div>
                  <div class="summary-row summary-total">
                    <span>Total Paid</span>
                    <span>₹${total.toFixed(2)}</span>
                  </div>
                </div>

                <div style="margin-top: 40px; text-align: center;">
                  <p style="font-size: 11px; color: #94a3b8; font-weight: 600;">This is a computer generated receipt and does not require a physical signature.</p>
                </div>
              </div>
              ${footerHtml}
            </div>
          </body>
          </html>
        `;

        // Save HTML for printing
        setGeneratedHtml({
          labToken: labTokenHtml,
          billing: billingHtml
        });
        setShowSuccess(true);
        toast.success(res.labOrder ? 'Lab Order Sent Successfully!' : 'Lab Token Created Successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create lab token');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintDocument = (type: 'labToken' | 'billing') => {
    if (!generatedHtml) return;

    const html = type === 'labToken' ? generatedHtml.labToken : generatedHtml.billing;
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      // Trigger print after content loads
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast.error('Please allow popups to print documents');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-24">
      <div className="max-w-7xl mx-auto p-3 sm:p-6 print:hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 sm:p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg md:text-xl lg:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter italic">
                <Beaker className="text-purple-600" size={24} />
                Lab Request
              </h1>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Create token for laboratory tests</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-4 sm:space-y-6">
          {/* Priority */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Request Priority</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                { value: 'routine', label: 'Routine', color: 'blue' },
                { value: 'urgent', label: 'Urgent', color: 'orange' },
                { value: 'stat', label: 'Stat', color: 'red' }
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value as any)}
                  className={`py-3 sm:py-4 px-2 sm:px-4 rounded-xl sm:rounded-2xl border-2 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${priority === p.value
                    ? `border-${p.color}-600 bg-${p.color}-50 dark:bg-${p.color}-900/20 text-${p.color}-700 dark:text-${p.color}-400 shadow-lg shadow-${p.color}-500/10 scale-[1.02]`
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 text-gray-400'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tests */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Investigations</label>
              <button
                onClick={addTest}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs text-purple-600 hover:text-purple-700 font-black bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full uppercase tracking-widest transition-all active:scale-95"
              >
                <Plus size={14} />
                Add Node
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {tests.map((test, index) => (
                <div key={index} className={`group relative bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-all ${activeSearchIndex === index ? 'z-50' : 'z-10'}`}>
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Investigation Name *</label>
                          <div className="relative">
                            {activeSearchIndex === index && (
                              <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setActiveSearchIndex(null)}
                              />
                            )}
                            <input
                              type="text"
                              value={test.name}
                              onChange={(e) => handleSearch(e.target.value, index)}
                              onFocus={() => handleSearch(test.name, index)}
                              placeholder="Search test..."
                              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm font-bold placeholder:text-gray-300 relative z-50 transition-all"
                            />
                            {activeSearchIndex === index && searchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                {searchResults.map((res: any) => (
                                  <button
                                    key={res._id}
                                    onClick={() => selectTest(res, index)}
                                    className="w-full text-left px-5 py-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b border-gray-50 dark:border-gray-800 last:border-0 flex justify-between items-center group transition-colors"
                                  >
                                    <div>
                                      <div className="text-[11px] font-black text-gray-800 dark:text-gray-200 group-hover:text-purple-600 uppercase tracking-tight">{res.testName || res.name}</div>
                                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{res.departmentId?.name || 'General'}</div>
                                    </div>
                                    <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg uppercase tracking-widest">
                                      ₹{res.price}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Category</label>
                          <select
                            value={test.category}
                            onChange={(e) => updateTest(index, 'category', e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm font-bold appearance-none transition-all cursor-pointer"
                          >
                            {testCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Special Instructions</label>
                          <input
                            type="text"
                            value={test.instructions}
                            onChange={(e) => updateTest(index, 'instructions', e.target.value)}
                            placeholder="e.g. Fasting required"
                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm font-medium placeholder:text-gray-300 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Unit Cost (₹)</label>
                          <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            value={test.price}
                            readOnly
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl sm:rounded-2xl outline-none text-xs sm:text-sm font-black text-gray-400 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                    {tests.length > 1 && (
                      <button
                        onClick={() => removeTest(index)}
                        className="flex items-center justify-center gap-2 w-full py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest sm:hidden border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 size={14} /> Remove Investigation
                      </button>
                    )}
                    {tests.length > 1 && (
                      <button
                        onClick={() => removeTest(index)}
                        className="hidden sm:flex absolute -top-2 -right-2 w-10 h-10 items-center justify-center bg-white dark:bg-gray-800 text-gray-400 hover:text-rose-500 hover:shadow-lg rounded-xl border border-gray-100 dark:border-gray-700 transition-all active:scale-95"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Billing Summary */}
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Total Aggregate</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">No tax applied to diagnostic procedures</div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tighter">₹{subtotal.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Clinical Annotations</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific information for the pathologist or radiologist..."
              rows={4}
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-[2rem] focus:ring-2 focus:ring-purple-500 outline-none resize-none text-xs sm:text-sm font-medium placeholder:text-gray-300 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              onClick={() => router.back()}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-500 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Protocol Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-2 px-8 py-4 sm:py-5 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-xl shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:gap-5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Synchronizing...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Deploy Token to Lab
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && generatedHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Lab Token Created!</h2>
              <p className="text-gray-500">Ready to print documents</p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => handlePrintDocument('labToken')}
                className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Print Lab Token
              </button>
              <button
                onClick={() => handlePrintDocument('billing')}
                className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Print Billing Receipt
              </button>
              {/* Visual Confirmation */}
              <div className="mt-2 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  <Activity size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-800">Sent to Lab</p>
                  <p className="text-[10px] text-gray-500">Lab staff has been notified instantly.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  const returnUrl = ((searchParams?.get('returnUrl') ?? null) ?? null);
                  if (returnUrl) {
                    router.push(returnUrl);
                  } else if (appointmentId) {
                    router.push(getPath(`/doctor/appointment/${appointmentId}`));
                  } else if (patientId) {
                    router.push(getPath(`/doctor/patients/${patientId}`));
                  } else {
                    router.push(getPath('/doctor'));
                  }
                }}
                className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl"
              >
                Done & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(CreateLabTokenPage);
