'use client';

import React, { useState } from 'react';
import { 
    FileText, CheckCircle2, AlertCircle, Plus, Trash2, 
    ClipboardCheck, Activity, ShieldAlert, FlaskConical
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface RadiologyReportModuleProps {
    orderId: string;
    hospitalId: string;
    onSuccess?: () => void;
}

export const RadiologyReportModule: React.FC<RadiologyReportModuleProps> = ({ orderId, hospitalId, onSuccess }) => {
    const [reportData, setReportData] = useState({
        technique: '',
        findings: {
            organWise: [{ organ: '', finding: '' }]
        },
        impression: '',
        conclusion: '',
        critical: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateFindings = (index: number, field: 'organ' | 'finding', value: string) => {
        const newOrganWise = [...reportData.findings.organWise];
        newOrganWise[index][field] = value;
        setReportData({ ...reportData, findings: { organWise: newOrganWise } });
    };

    const addOrgan = () => {
        setReportData({
            ...reportData,
            findings: { organWise: [...reportData.findings.organWise, { organ: '', finding: '' }] }
        });
    };

    const removeOrgan = (index: number) => {
        const newOrganWise = reportData.findings.organWise.filter((_, i) => i !== index);
        setReportData({ ...reportData, findings: { organWise: newOrganWise } });
    };

    const handleSubmitReport = async () => {
        if (!reportData.impression || !reportData.conclusion || reportData.findings.organWise.length === 0) {
            toast.error('Impression, Conclusion and at least one Finding are required.');
            return;
        }

        // Critical findings auto-detection
        const allText = JSON.stringify(reportData).toLowerCase();
        const criticalKeywords = ['mass', 'hemorrhage', 'fracture', 'malignancy', 'bleed', 'stroke', 'aneurysm'];
        const isCritical = criticalKeywords.some(kw => allText.includes(kw)) || reportData.critical;

        setIsSubmitting(true);
        try {
            const response = await axios.post(`/api/v1/${hospitalId}/prescriptions/radiology/reports/${orderId}`, {
                ...reportData,
                critical: isCritical
            });

            if (response.data.success) {
                toast.success('Radiology Report Finalized.');
                onSuccess?.();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit report.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-indigo-600 p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest leading-none mb-1">Radiology Reporting</h2>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Structured Findings & Impressions</p>
                    </div>
                </div>
                {reportData.critical && (
                    <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full animate-pulse">
                        <ShieldAlert size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Critical Finding</span>
                    </div>
                )}
            </div>

            <div className="p-8 space-y-8">
                {/* 1. Technique */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <FlaskConical size={18} className="text-indigo-600" />
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Imaging Technique</label>
                    </div>
                    <textarea value={reportData.technique} onChange={e => setReportData({ ...reportData, technique: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="Describe scan protocol, contrast agents used, etc." rows={2} />
                </div>

                {/* 2. Structured Findings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity size={18} className="text-indigo-600" />
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Organ-Wise Findings</label>
                        </div>
                        <button onClick={addOrgan} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2">
                            <Plus size={14} /> Add Region
                        </button>
                    </div>

                    <div className="space-y-3">
                        {reportData.findings.organWise.map((fw, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group animate-in slide-in-from-right-2 duration-300">
                                <input value={fw.organ} onChange={e => updateFindings(idx, 'organ', e.target.value)}
                                    className="w-48 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-indigo-700 outline-none" placeholder="Organ/System" />
                                <input value={fw.finding} onChange={e => updateFindings(idx, 'finding', e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" placeholder="Description of findings..." />
                                <button onClick={() => removeOrgan(idx)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Impression & Conclusion */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Radiology Impression</label>
                        <textarea value={reportData.impression} onChange={e => setReportData({ ...reportData, impression: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-32 resize-none"
                            placeholder="Primary clinical interpretation..." />
                    </div>
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Conclusion / Final Diagnosis</label>
                        <textarea value={reportData.conclusion} onChange={e => setReportData({ ...reportData, conclusion: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black text-indigo-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-32 resize-none"
                            placeholder="Final take-home message for the doctor..." />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={reportData.critical} onChange={e => setReportData({ ...reportData, critical: e.target.checked })}
                            className="w-6 h-6 rounded-lg border-slate-300 text-red-600 focus:ring-red-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Manual Critical Flag</span>
                            <span className="text-[8px] font-bold text-slate-400">Forces immediate notification to doctor</span>
                        </div>
                    </label>

                    <button onClick={handleSubmitReport} disabled={isSubmitting}
                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3">
                        {isSubmitting ? (
                            <Activity className="animate-spin" size={18} />
                        ) : (
                            <ClipboardCheck size={18} />
                        )}
                        Finalize & Sign Report
                    </button>
                </div>
            </div>
        </div>
    );
};
