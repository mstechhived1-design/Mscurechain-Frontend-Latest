'use client';

import React, { useEffect, useState } from 'react';
import { X, Beaker, FileText, Calendar, User, Download, CheckCircle, Clock } from 'lucide-react';
import { ipdService } from '@/lib/integrations';
import toast from 'react-hot-toast';

interface LabReportsViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
}

export default function LabReportsViewModal({ isOpen, onClose, admissionId, patientName }: LabReportsViewModalProps) {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchReports();
        }
    }, [isOpen, admissionId]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            console.log("Fetching lab reports for Admission ID (string):", admissionId);
            const data = await ipdService.getLabReports(admissionId);
            console.log("Fetched lab reports data:", data);
            setReports(data);
        } catch (error: any) {
            toast.error("Failed to fetch lab reports");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-[1rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* HEADER */}
                <div className="p-8 bg-primary-theme text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Beaker size={24} className="text-purple-400" />
                            <h2 className="text-xl font-black uppercase ">Lab Reports</h2>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{patientName} • ADM: {admissionId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Analyzing Data...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white rounded-[32px] border border-dashed border-slate-200">
                            <Beaker size={48} strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest">No lab reports found for this admission</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {reports.map((report) => (
                                <div key={report._id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:border-purple-200 transition-all group">
                                    <div className="p-6 bg-slate-50/50 border-b border-slate-50 flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight mb-1">
                                                Order #{report._id.toString().slice(-6).toUpperCase()}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${report.status === 'completed'
                                            ? 'bg-green-50 text-green-600 border-green-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {report.status}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 space-y-4">
                                        <div className="space-y-2">
                                            {report.tests?.map((t: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{t.test?.testName || t.test?.name || 'Unknown'}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.status}</p>
                                                        </div>
                                                        {t.status === 'completed' ? (
                                                            <div className="text-right">
                                                                <p className="text-xs font-black text-slate-900">{t.result || 'SEE DETAILS'}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Result</p>
                                                            </div>
                                                        ) : (
                                                            <Clock size={16} className="text-amber-400" />
                                                        )}
                                                    </div>

                                                    {/* SUB-TESTS DETAILS */}
                                                    {t.subTests?.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-slate-200/50 space-y-2">
                                                            {t.subTests.map((sub: any, sIdx: number) => (
                                                                <div key={sIdx} className="flex justify-between items-center text-[9px]">
                                                                    <span className="font-bold text-slate-500 uppercase">{sub.name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-slate-800">{sub.result} {sub.unit}</span>
                                                                        {sub.range && (
                                                                            <span className="text-[8px] text-slate-400 lowercase">({sub.range})</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-8 border-t border-slate-100 bg-white flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-primary-theme text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
