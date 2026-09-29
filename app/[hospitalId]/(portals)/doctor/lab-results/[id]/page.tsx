'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, ArrowLeft, FileText, Clock} from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import LabReportTemplate from '@/components/lab/LabReportTemplate';

export default function DoctorLabResultDetailPage() {
    const params = useParams() as any;
    const id = params?.id as string;
    const router = useRouter();
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const isDoctorNotified = ((searchParams?.get('notified') ?? null) ?? null) === 'true';

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [labInfo, setLabInfo] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
            fetchLabSettings();
        }
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const data = await apiClient<any>(`/lab/orders/${id}`);
            if (data) {
                const rawOrder = data;

                // Construct patient details with better fallbacks and official MRN from profile if available
                const patientDetails = {
                    name: rawOrder.patient?.name || rawOrder.patientDetails?.name || 'Unknown Patient',
                    age: rawOrder.patient?.age || calculateAge(rawOrder.patient?.dob || rawOrder.patient?.dateOfBirth) || rawOrder.patientDetails?.age || 0,
                    gender: rawOrder.patient?.gender || rawOrder.patientDetails?.gender || 'N/A',
                    mobile: rawOrder.patient?.mobile || rawOrder.patientDetails?.mobile || '',
                    refDoctor: rawOrder.referredBy || rawOrder.doctor?.name || rawOrder.patientDetails?.refDoctor || 'Self',
                    patientId: rawOrder.patient?.mrn || rawOrder.patientDetails?.patientId || rawOrder._id.toString().slice(-6).toUpperCase()
                };

                const mappedSample = {
                    _id: rawOrder._id,
                    sampleId: rawOrder.tokenNumber || rawOrder.sampleId || rawOrder._id.toString().slice(-6).toUpperCase(),
                    patientDetails: patientDetails,
                    collectionDate: rawOrder.createdAt || rawOrder.sampleCollectedAt,
                    reportDate: rawOrder.completedAt || rawOrder.updatedAt || rawOrder.resultsEnteredAt,
                    status: rawOrder.status, // Use backend literal ('Completed', 'Pending', 'In Processing')
                    doctorNotified: rawOrder.doctorNotified,
                    tests: (rawOrder.tests || []).map((t: any) => ({
                        testName: t.testName || t.test?.testName || 'Test',
                        resultValue: t.result || t.resultValue,
                        unit: t.unit || t.test?.unit,
                        isAbnormal: t.isAbnormal,
                        subTests: t.subTests || [],
                        resultParameters: t.resultParameters || t.test?.resultParameters || [],
                        remarks: t.remarks
                    }))
                };
                setOrder(mappedSample);
            } else {
                toast.error('Failed to load lab results');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Error loading lab results');
        } finally {
            setLoading(false);
        }
    };

    const fetchLabSettings = async () => {
        try {
            const data = await apiClient<any>('/lab/settings');
            if (data) {
                setLabInfo(data);
            }
        } catch (error) {
            console.error('Failed to fetch lab settings');
        }
    };

    const calculateAge = (dob: string) => {
        if (!dob) return 0;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleDownload = async () => {
        const element = printRef.current;
        if (!element) return;

        const toastId = toast.loading('Generating PDF...');
        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 5;

            const imgWidth = pdfWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight, pdfHeight - (margin * 2)));
            pdf.save(`Lab_Report_${order?.sampleId || 'download'}.pdf`);
            toast.success('PDF Downloaded', { id: toastId });
        } catch (error) {
            toast.error('Failed to generate PDF', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order not found</h2>
                <button
                    onClick={() => router.back()}
                    className="mt-4 text-blue-500 hover:underline inline-flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Go back
                </button>
            </div>
        );
    }

    // A report is ONLY accessible to the doctor when:
    // 1. The order is completed (results entered), AND
    // 2. The lab technician has explicitly clicked "Notify Doctor" (doctorNotified: true)
    // Direct URL access is blocked by this check — the backend also enforces this.
    const isReleased = order.status?.toLowerCase() === 'completed' && order.doctorNotified === true;
    const showReport = isReleased;

    if (!showReport) {
        return (
            <div className="min-h-screen bg-secondary-theme flex flex-col items-center justify-center p-4 sm:p-6">
                <div className="max-w-md w-full bg-card rounded-2xl sm:rounded-[32px] shadow-2xl p-6 sm:p-10 text-center border border-border-theme">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 transform rotate-3">
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 animate-pulse" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2 sm:mb-3 tracking-tight">
                        Report Pending
                    </h2>
                    <p className="text-xs sm:text-sm text-muted mb-6 sm:mb-10 leading-relaxed font-medium">
                        The lab results for <span className="font-bold text-foreground">{order.patientDetails?.name}</span> are currently being processed. You will be notified once the final report is ready.
                    </p>

                    <div className="bg-secondary-theme rounded-xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-10 text-left border border-border-theme">
                        <div className="flex justify-between items-center mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border-theme">
                            <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">Status</span>
                            <span className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wide">
                                {order.status}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-3 sm:mb-4">
                            <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">Requested</span>
                            <span className="text-[11px] sm:text-[13px] font-bold text-foreground">
                                {new Date(order.collectionDate || order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                <span className="mx-1 opacity-30">•</span>
                                {new Date(order.collectionDate || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">Sample ID</span>
                            <span className="text-[11px] sm:text-[13px] font-mono font-bold text-foreground">#{order.sampleId}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => router.back()}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-foreground text-background font-bold rounded-xl sm:rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-sm sm:text-base"
                    >
                        Back to Results
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-theme p-3 sm:p-6 md:p-8 pt-4 lg:pt-6">
            {/* Header Actions */}
            <div className="max-w-[210mm] mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-muted hover:text-foreground font-bold text-xs sm:text-sm transition-colors w-full sm:w-auto"
                >
                    <ArrowLeft size={16} className="sm:size-[18px]" />
                    Back to Results
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleDownload}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/20 transition-all font-bold text-xs sm:text-sm tracking-wide active:scale-95"
                    >
                        <Download size={16} className="sm:size-[18px]" />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-xl rounded-sm overflow-hidden ring-1 ring-border-theme p-1 sm:p-0">
                <div className="overflow-x-auto no-scrollbar">
                    <div className="min-w-[700px] sm:min-w-0">
                        <LabReportTemplate ref={printRef} sample={order} labInfo={labInfo} />
                    </div>
                </div>
            </div>

            <p className="mt-8 text-center text-[10px] sm:text-xs text-muted">
                This report is electronically generated and verified by the MS CURE CHAIN Laboratory System.
            </p>
        </div>
    );
}
