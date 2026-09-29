'use client';

import React from 'react';
import { FlaskConical, User,  ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';

interface Test {
    name: string;
    testName?: string;
    category: string;
    instructions?: string;
    result?: string | null;
    status?: string;
    isAbnormal?: boolean;
    remarks?: string;
    subTests?: {
        name: string;
        result: string;
        unit: string;
        range: string;
    }[];
}

interface LabRecord {
    _id: string;
    tokenNumber: string;
    tests: Test[];
    priority: 'routine' | 'urgent' | 'stat';
    status: 'pending' | 'collected' | 'processing' | 'completed' | 'prescribed' | 'sample_collected';
    notes?: string;
    createdAt: string;
    source?: 'lab-token' | 'lab-order';
    paymentStatus?: string;
    resultsEnteredAt?: string;
    completedAt?: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string; // Fallback
        specialties?: string[];
    };
    hospital: {
        name: string;
    };
}

interface LabRecordsSectionProps {
    labRecords: LabRecord[];
    patientName?: string;
    patientEmail?: string;
}

export default function LabRecordsSection({
    labRecords,
    patientName = 'Valued Patient',
    patientEmail = ''
}: LabRecordsSectionProps) {
    const [expandedResults, setExpandedResults] = React.useState<Record<string, boolean>>({});

    const toggleResults = (id: string) => {
        setExpandedResults(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        const colors: Record<string, string> = {
            'pending': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            'collected': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'sample_collected': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'processing': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            'completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            'prescribed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
        return colors[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!labRecords || labRecords.length === 0) {
        return (
            <Card className="p-8 text-center border-dashed bg-gray-50/50 dark:bg-white/5">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <FlaskConical className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">No Laboratory Records</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">Reports from clinical investigative tests will appear here.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                    <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Laboratory <span className="text-blue-600">Reports</span>
                    </h2>
                    <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Clinical Investigation History</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full">
                {labRecords.map((record) => {
                    const isCompleted = record.status === 'completed';
                    const isExpanded = expandedResults[record._id];

                    return (
                        <div key={record._id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-3xl p-3 sm:p-5 shadow-sm hover:shadow-lg transition-all group overflow-hidden w-full ${isCompleted ? 'hover:border-emerald-200' : 'hover:border-blue-200'}`}>
                            <div className="flex flex-col w-full">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    {/* Main Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1.5 ">
                                            <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded tracking-widest ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                            <span className="text-[8px] sm:text-[10px] font-mono text-gray-400">
                                                #{record.tokenNumber}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-lg uppercase tracking-tight truncate italic">
                                            Lab Investigation Order
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                            <User className="w-2.5 h-2.5 text-blue-600" />
                                            Dr. {record.doctor?.user?.name?.replace(/^Dr\.\s*/i, '') || record.doctor?.name?.replace(/^Dr\.\s*/i, '') || 'Specialist'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => isCompleted && toggleResults(record._id)}
                                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${isCompleted ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'} shrink-0`}
                                            disabled={!isCompleted}
                                        >
                                            {isCompleted && (isExpanded ? <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />)}
                                            {isCompleted ? (isExpanded ? 'Close Report' : 'View Report') : 'Pending Report'}
                                        </button>

                                        {/* Date Badge shifted to RIGHT */}
                                        <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-16 sm:h-16 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                                            <span className="text-[7px] sm:text-[10px] font-black uppercase text-gray-400 tracking-tighter leading-none mb-0.5">
                                                {format(new Date(record.createdAt), 'MMM')}
                                            </span>
                                            <span className="text-xs sm:text-2xl font-black text-gray-950 dark:text-white leading-none">
                                                {format(new Date(record.createdAt), 'dd')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Grid - Full Width Usage */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <div className="bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden">
                                        <p className="text-[6px] sm:text-[7px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Facility</p>
                                        <p className="text-[9px] sm:text-[10px] font-black text-gray-800 dark:text-gray-200 truncate uppercase">{record.hospital.name}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/10">
                                        <p className="text-[6px] sm:text-[7px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Parameters</p>
                                        <p className="text-[9px] sm:text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase">{record.tests.length} Count</p>
                                    </div>
                                </div>

                                {/* Tests List with Status */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {record.tests.map((t, idx) => (
                                        <div key={idx} className="px-2 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg flex items-center gap-2 shadow-sm">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">{t.name || t.testName || 'Test'}</span>
                                            <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${getStatusColor(t.status || record.status)}`}>
                                                {t.status || record.status || 'PENDING'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && isCompleted && (
                                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-1 gap-3">
                                            {record.tests.map((test, tidx) => (
                                                <div key={tidx} className={`p-4 rounded-xl border transition-all ${test.isAbnormal ? 'bg-red-50/30 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10'}`}>
                                                    <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                                                        <div>
                                                            <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm">
                                                                {test.name || test.testName || 'Investigation'}
                                                            </h4>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">{test.category}</p>
                                                        </div>
                                                        {test.result && (
                                                            <div className={`px-4 py-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm ${test.isAbnormal ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                                                <p className="text-[7px] font-black uppercase leading-none mb-1 opacity-80">Reference Match</p>
                                                                <p className="text-xs font-black uppercase tracking-tight">{test.result}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {test.subTests && test.subTests.length > 0 && (
                                                        <div className="mt-4 overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="border-b border-gray-200 dark:border-white/10">
                                                                        <th className="py-2 text-[8px] font-black text-gray-400 uppercase">Parameter</th>
                                                                        <th className="py-2 text-[8px] font-black text-gray-400 uppercase">Result</th>
                                                                        <th className="py-2 text-[8px] font-black text-gray-400 uppercase">Normal Range</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {test.subTests.map((s, sidx) => (
                                                                        <tr key={sidx} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                                                                            <td className="py-2 text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">{s.name}</td>
                                                                            <td className="py-2 text-[10px] font-black text-gray-950 dark:text-white uppercase">{s.result} <span className="text-[8px] font-medium text-gray-400 lowercase">{s.unit}</span></td>
                                                                            <td className="py-2 text-[9px] font-bold text-gray-400 uppercase">{s.range}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {record.notes && (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block mb-1">Clinical Remarks</span>
                                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 italic uppercase leading-relaxed">&ldquo;{record.notes}&rdquo;</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
