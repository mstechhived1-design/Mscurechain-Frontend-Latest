'use client';

import React, { useState, useEffect } from 'react';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { Activity, BedDouble, CheckCircle2, Search, FileText, Printer, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import IPDLedgerDocument from '@/components/documents/IPDLedgerDocument';

export default function HRInpatientsPage() {
    const [activeTab, setActiveTab] = useState<'progress' | 'completed'>('progress');
    const [activePatients, setActivePatients] = useState<any[]>([]);
    const [completedPatients, setCompletedPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [ledgerSummary, setLedgerSummary] = useState<any>(null);
    const [hospitalDetails, setHospitalDetails] = useState<any>(null);
    const [ledgerAdmission, setLedgerAdmission] = useState<any>(null);

    const fetchAdmissions = async () => {
        setLoading(true);
        try {
            if (activeTab === 'progress') {
                const data = await ipdService.getActiveAdmissions();
                setActivePatients(data || []);
            } else {
                const data = await ipdService.getDischargedAdmissions();
                setCompletedPatients(data || []);
            }
        } catch (error) {
            console.error("Failed to fetch admissions", error);
            toast.error("Failed to load patient data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmissions();
    }, [activeTab]);

    const handlePrintLedger = async (admission: any) => {
        try {
            const admissionId = admission.admissionId || admission._id;
            setPrintingId(admissionId);
            setLedgerAdmission(admission);
            
            // Parallel fetch for speed
            const [summary, hospitalResponse] = await Promise.all([
                ipdService.getBillSummary(admissionId),
                import('@/lib/integrations/services/hospitalAdmin.service').then(m => m.hospitalAdminService.getHospital())
            ]);
            
            let hd = { name: 'Hospital Name', address: 'Hospital Address', phone: 'Phone Number', email: 'Email' };
            
            if (hospitalResponse?.hospital) {
                const h = hospitalResponse.hospital;
                hd = {
                    name: h.name || 'Hospital Name',
                    address: h.address || 'Hospital Address',
                    phone: h.phone || 'Phone Number',
                    email: h.email || 'Email'
                };
            } else {
                // Try to get hospital details from localStorage if API fails
                try {
                    const hospitalStr = localStorage.getItem('hospital');
                    const userStr = localStorage.getItem('user');
                    
                    if (hospitalStr) {
                        const h = JSON.parse(hospitalStr);
                        hd = {
                            name: h.name || 'Hospital Name',
                            address: h.address || 'Hospital Address',
                            phone: h.contactNumber || h.phone || 'Phone Number',
                            email: h.email || 'Email'
                        };
                    } else if (userStr) {
                        const u = JSON.parse(userStr);
                        if (u.hospital) {
                            const h = u.hospital;
                            hd = {
                                name: h.name || 'Hospital Name',
                                address: h.address || 'Hospital Address',
                                phone: h.contactNumber || h.phone || 'Phone Number',
                                email: h.email || 'Email'
                            };
                        }
                    }
                } catch (e) { console.warn("Could not parse hospital details"); }
            }

            setHospitalDetails(hd);
            setLedgerSummary(summary);
            
            // Allow React to render the component into the hidden div
            setTimeout(() => {
                const printWindow = window.open('', '_blank');
                const content = document.querySelector('.print-ledger-container')?.innerHTML;

                if (printWindow && content) {
                    printWindow.document.write(`
                        <html>
                            <head>
                                <title>Patient Ledger Print</title>
                                <style>
                                    @media print {
                                        @page { size: A4; margin: 0; }
                                        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    }
                                </style>
                            </head>
                            <body>
                                ${content}
                                <script>
                                    window.onload = () => {
                                        window.print();
                                    }
                                </script>
                            </body>
                        </html>
                    `);
                    // Clone style/link sheets from main window for instant rendering
                    const styles = document.querySelectorAll('link[rel="stylesheet"], style');
                    styles.forEach(style => {
                        printWindow.document.head.appendChild(style.cloneNode(true));
                    });
                    printWindow.document.close();
                }
                setPrintingId(null);
                toast.success("Ledger generated successfully");
            }, 100);

        } catch (error) {
            console.error("Print ledger error", error);
            toast.error("Failed to generate ledger. Please try again.");
            setPrintingId(null);
        }
    };

    const currentData = activeTab === 'progress' ? activePatients : completedPatients;
    
    const filteredData = currentData.filter(patient => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const name = patient.patient?.name?.toLowerCase() || '';
        const mrn = patient.patient?.mrn?.toLowerCase() || '';
        const bed = patient.bed?.bedId?.toLowerCase() || '';
        return name.includes(q) || mrn.includes(q) || bed.includes(q);
    });

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BedDouble className="text-indigo-600 size-6 md:size-8" strokeWidth={2.5} />
                        INPATIENTS DIRECTORY
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                        Monitor active admissions and historical ledgers
                    </p>
                </div>
            </div>

            {/* Controls: Tabs & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex w-full md:w-auto bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('progress')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'progress' 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Activity size={14} />
                        Inpatient Progress
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'completed' 
                                ? 'bg-white text-emerald-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <CheckCircle2 size={14} />
                        Completed Inpatients
                    </button>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input
                        type="text"
                        placeholder="Search by Name, MRN, Bed..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Patient Name & MRN</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Room / Bed</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Reason / Diagnosis</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Primary Doctor</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse bg-white">
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div><div className="h-3 bg-slate-100 rounded w-1/2"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-2/3"></div></td>
                                        <td className="p-4 text-right"><div className="h-8 bg-slate-200 rounded w-24 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="size-8 text-slate-300" />
                                            <p className="font-semibold">No patients found</p>
                                            <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((admission) => (
                                    <tr key={admission._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{admission.patient?.name || 'Unknown Patient'}</div>
                                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                MRN: <span className="font-mono text-slate-700">{admission.patient?.mrn || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${activeTab === 'progress' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                <span className="font-bold text-slate-700">
                                                    {admission.bed?.room || 'N/A'} / <span className="text-indigo-600">{admission.bed?.bedId || 'N/A'}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-slate-600 font-medium line-clamp-2" title={admission.reason}>
                                                {admission.reason || 'No specific reason provided'}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-slate-700">
                                                 {admission.primaryDoctor?.user?.name || admission.primaryDoctor?.name || 'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {activeTab === 'progress' ? (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-100">
                                                    <Clock size={14} /> Active
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handlePrintLedger(admission)}
                                                    disabled={printingId === (admission.admissionId || admission._id)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {printingId === (admission.admissionId || admission._id) ? (
                                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Printer size={14} />
                                                    )}
                                                    View Ledger
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Print Container */}
            <div className="hidden">
                {ledgerSummary && (
                    <div className="print-ledger-container w-full">
                        <IPDLedgerDocument summary={ledgerSummary} hospitalDetails={hospitalDetails} admission={ledgerAdmission} />
                    </div>
                )}
            </div>
        </div>
    );
}
