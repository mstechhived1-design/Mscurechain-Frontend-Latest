'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { LabSample } from '@/lib/integrations/types/labSample';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import {
    FlaskConical,
    Download,
    Eye,
    Activity,
    Clock,
    CheckCircle2,
    History,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ResultPrintView from '@/components/lab/ResultPrintView';
import { toast } from 'react-hot-toast';

function HospitalAdminLabSamplesPage() {
    const [samples, setSamples] = useState<LabSample[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All Samples');
    const [printingSample, setPrintingSample] = useState<LabSample | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setPrintingSample(null),
    });

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (printingSample && printRef.current) {
            timer = setTimeout(() => {
                handlePrint();
            }, 150);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [printingSample, handlePrint]);

    useEffect(() => {
        fetchSamples();
    }, [filter]);

    const fetchSamples = async () => {
        setLoading(true);
        try {
            const data = await LabSampleService.getSamples(filter);
            setSamples(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to synchronize sample manifest");
        } finally {
            setLoading(false);
        }
    };

    const handleCollect = async (id: string) => {
        try {
            await LabSampleService.collectSample(id);
            toast.success('Sample collection synchronized');
            fetchSamples();
        } catch (error) {
            toast.error('Sample collection protocol failed');
        }
    };

    const handleDownload = async (sample: LabSample) => {
        setPrintingSample(sample);
        if (sample.status === 'In Processing') {
            try {
                await LabSampleService.updateResults(sample._id, { status: 'Completed' });
                fetchSamples();
            } catch (error) {
                console.error("Failed to mark as completed", error);
            }
        }
    };

    const stats = {
        pending: samples.filter(s => s.status === 'Pending').length,
        processing: samples.filter(s => s.status === 'In Processing').length,
        completed: samples.filter(s => s.status === 'Completed').length,
    };

    return (
        <div className="space-y-10 ">
            {/* Header Tier */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">Sample Tracking</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                        <History className="w-3 h-3 text-blue-500" />
                        Bio-Material Lifecycle & Diagnostic Workflow
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    {['All Samples', 'Pending', 'In Processing', 'Completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {f.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Strategic Workflow Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group cursor-default">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Awaiting Collection</p>
                        <h3 className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter">{(stats.pending).toString().padStart(2, '0')}</h3>
                    </div>
                    <div className="p-2 md:p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl text-gray-400">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group cursor-default">
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Active processing</p>
                        <h3 className="text-4xl font-black text-blue-600 italic tracking-tighter">{(stats.processing).toString().padStart(2, '0')}</h3>
                    </div>
                    <div className="p-2 md:p-4 bg-blue-50 dark:bg-blue-500/10 rounded-3xl text-blue-600">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-4xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group cursor-default">
                    <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Manifest Completed</p>
                        <h3 className="text-4xl font-black text-emerald-600 italic tracking-tighter">{(stats.completed).toString().padStart(2, '0')}</h3>
                    </div>
                    <div className="p-2 md:p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Data manifest Console */}
            <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Segment</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Biological Patient</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Material Type</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Hub</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Operation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="opacity-50">
                                        <td colSpan={5} className="px-2 md:px-8 py-6"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : samples.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-2 md:px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50">
                                            <FlaskConical className="w-12 h-12 text-gray-300" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">No Biological Data In Current Sector</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                samples.map((sample) => (
                                    <tr key={sample._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 group">
                                        <td className="px-2 md:px-8 py-6">
                                            <span className="text-[10px] font-black italic bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl uppercase">#{sample.sampleId}</span>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter underline underline-offset-4 decoration-gray-100 dark:decoration-gray-800">{sample.patientDetails.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{sample.patientDetails.age}Y • {sample.patientDetails.gender}</p>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl text-[9px] uppercase font-black tracking-widest border border-purple-100 dark:border-purple-800/30">
                                                {sample.sampleType || 'LAB_UNIT'}
                                            </span>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {sample.tests.map((t, idx) => (
                                                    <span key={idx} className="text-[8px] font-bold text-gray-400 uppercase bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-full">{t.testName}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${sample.status === 'Completed' ? 'bg-emerald-500 opacity-50' : sample.status === 'Pending' ? 'bg-amber-400' : 'bg-blue-500'}`}></div>
                                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${sample.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : sample.status === 'Pending' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'}`}>
                                                    {sample.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-8 py-6 text-right">
                                            <div className="flex justify-end gap-3 translate-x-4 group-hover:translate-x-0 opacity-100">
                                                {sample.status === 'Pending' ? (
                                                    <button
                                                        onClick={() => handleCollect(sample._id)}
                                                        className="inline-flex items-center px-3 md:px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
                                                    >
                                                        Collect Bio-material
                                                        <ArrowRight className="w-4 h-4 ml-2" />
                                                    </button>
                                                ) : sample.status === 'In Processing' ? (
                                                    <Link
                                                        href={`/hospital-admin/labs/samples/${sample._id}`}
                                                        className="inline-flex items-center px-3 md:px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 whitespace-nowrap"
                                                    >
                                                        Result Protocol
                                                        <ChevronRight className="w-4 h-4 ml-2" />
                                                    </Link>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Link
                                                            href={`/hospital-admin/labs/samples/${sample._id}`}
                                                            className="p-3 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100"
                                                            title="Inspect Data"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDownload(sample)}
                                                            className="p-3 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl hover:bg-emerald-100"
                                                            title="Extract Report"
                                                        >
                                                            <Download className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>

            {/* Hidden Print Anchor */}
            <div className="hidden">
                <div ref={printRef}>
                    {printingSample && <ResultPrintView sample={printingSample} />}
                </div>
            </div>

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminLabSamplesPage);
