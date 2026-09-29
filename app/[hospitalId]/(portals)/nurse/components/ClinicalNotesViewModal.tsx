'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Clock, User, Eye } from 'lucide-react';
import { ipdService } from '@/lib/integrations';
import toast from 'react-hot-toast';

interface ClinicalNotesViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
}

export default function ClinicalNotesViewModal({ isOpen, onClose, admissionId, patientName }: ClinicalNotesViewModalProps) {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const history = await ipdService.getClinicalHistory(admissionId);
            // Clinical history might contain vitals and notes, filter for notes
            const sortedNotes = (history.notes || []).sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setNotes(sortedNotes);
        } catch (error) {
            console.error("Failed to fetch clinical history:", error);
            toast.error("Failed to load clinical history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchHistory();
        }
    }, [isOpen, admissionId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[1rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                {/* HEADER */}
                <div className="p-6 bg-primary-theme text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Eye size={20} className="text-teal-400" />
                            <h2 className="text-lg font-black uppercase tracking-tight">Clinical History</h2>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{patientName} • ADM ID: {admissionId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-teal-500/10 border-t-teal-500 rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Clinical History...</p>
                        </div>
                    ) : notes.length > 0 ? (
                        <div className="space-y-4">
                            {notes.map((note, index) => (
                                <div key={note._id || index} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                                                <FileText size={14} className="text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{note.type}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Clock size={10} className="text-slate-400" />
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(note.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg">
                                            <User size={10} className="text-slate-400" />
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{note.author?.name || 'Staff'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                        {note.subjective && (
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subjective</span>
                                                <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{note.subjective}</p>
                                            </div>
                                        )}
                                        {note.objective && (
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Objective</span>
                                                <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{note.objective}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {note.assessment && (
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assessment</span>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                                    <p className="text-[10px] font-bold text-slate-800 leading-relaxed">{note.assessment}</p>
                                                </div>
                                            </div>
                                        )}
                                        {note.plan && (
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Plan</span>
                                                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                                                    <p className="text-[10px] font-bold text-slate-800 leading-relaxed">{note.plan}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-[28px] flex items-center justify-center text-slate-300">
                                <FileText size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">No History Found</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">This patient has no clinical notes yet.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-white border-t border-slate-100 text-center shrink-0">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Read-only View • Clinical Records Management System</p>
                </div>
            </div>
        </div>
    );
}
