'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LabSample } from '@/lib/integrations/types/labSample';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { Activity, RefreshCw, Trash2, User, TestTube, Clock, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';
import { toast } from 'react-hot-toast';

function ActiveTestsPage() {
    const router = useRouter();
    const [samples, setSamples] = useState<LabSample[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNavigating, startNavigation] = useTransition();

    useEffect(() => {
        fetchActiveSamples();

        const handleRefresh = () => {
            fetchActiveSamples();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchActiveSamples();
            }
        };

        window.addEventListener('refresh-lab-data', handleRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('refresh-lab-data', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchActiveSamples = async () => {
        setLoading(true);
        try {
            // Only fetch prescribed samples (tests prescribed by doctor but not yet collected)
            const prescribed = await LabSampleService.getSamples('prescribed', true);

            const sorted = prescribed.sort((a, b) => {
                const dateA = new Date(a.createdAt || '').getTime();
                const dateB = new Date(b.createdAt || '').getTime();
                return dateB - dateA;
            });

            setSamples(sorted);
        } catch (error) {
            console.error('Error fetching active samples:', error);
            toast.error("Failed to load active tests");
        } finally {
            setLoading(false);
        }
    };

    const handleCollect = async (id: string) => {
        try {
            await LabSampleService.collectSample(id);
            toast.success('Sample collected successfully!');
            fetchActiveSamples();
        } catch (error) {
            toast.error('Failed to collect sample');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lab test request?')) return;
        try {
            await LabSampleService.deleteSample(id);
            toast.success('Lab test request deleted');
            fetchActiveSamples();
        } catch (error) {
            toast.error('Failed to delete lab test request');
        }
    };

    if (loading && samples.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 font-medium">Loading active tests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Active Lab Tests</h1>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Tests suggested by doctors awaiting sample collection</p>
                    </div>
                    <button
                        onClick={fetchActiveSamples}
                        disabled={loading}
                        className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all border border-slate-200 dark:border-gray-700 shadow-sm"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm inline-block">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pending Sample Collection</p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{samples.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tests List */}
            {samples.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        All Caught Up!
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        No pending test collections at the moment
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {samples.map((sample) => (
                        <div
                            key={sample._id}
                            className="group bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all p-4 sm:p-6"
                        >
                            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                                <div className="hidden sm:flex w-14 h-14 rounded-xl items-center justify-center font-semibold text-white shadow-sm bg-indigo-500 shrink-0">
                                    {sample.patientDetails.name.charAt(0)}
                                </div>

                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {sample.patientDetails.name}
                                                </h3>
                                                {sample.priority && sample.priority !== 'routine' && (
                                                    <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded shadow uppercase animate-pulse">
                                                        🚨 {sample.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5" />
                                                    {sample.patientDetails.age}Y • {sample.patientDetails.gender}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(sample.createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right mt-2 sm:mt-0">
                                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sample ID</div>
                                            <div className="px-3 py-1.5 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{sample.sampleId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <TestTube className="w-4 h-4 text-gray-400" />
                                        <div className="flex flex-wrap gap-2">
                                            {sample.tests.map((test, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300"
                                                >
                                                    {test.testName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {sample.clinicalAnnotations && (
                                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium">
                                            📝 <span className="font-bold">Clinical Annotation:</span> {sample.clinicalAnnotations}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Pending Collection
                                        </span>

                                        <div className="hidden sm:block flex-1"></div>

                                        <button
                                            onClick={() => {
                                                const testNames = sample.tests.map(t => t.testName).join(',');
                                                const queryParams = new URLSearchParams({
                                                    name: sample.patientDetails.name,
                                                    mobile: sample.patientDetails.mobile || '',
                                                    age: sample.patientDetails.age.toString(),
                                                    gender: sample.patientDetails.gender,
                                                    tests: testNames,
                                                    sampleId: sample._id,
                                                    displayId: sample.sampleId,
                                                    refDoctor: sample.patientDetails.refDoctor || ''
                                                }).toString();
                                                startNavigation(() => {
                                                    router.push(`/lab/billing?${queryParams}`);
                                                });
                                            }}
                                            disabled={isNavigating}
                                            className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2 ${isNavigating ? 'opacity-70 cursor-wait' : ''}`}
                                        >
                                            {isNavigating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
                                            Generate Bill
                                        </button>

                                        <button
                                            onClick={() => handleCollect(sample._id)}
                                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                                        >
                                            Collect Sample
                                        </button>

                                        <button
                                            onClick={() => handleDelete(sample._id)}
                                            className="p-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default React.memo(ActiveTestsPage);
