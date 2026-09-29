'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { Clock, User, ArrowRight} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin';
import toast from 'react-hot-toast';
import { subscribeToSocket, unsubscribeFromSocket } from '@/lib/integrations/api/socket';

interface PendingDischargesQueueProps {
    searchTerm: string;
    page: number;
    basePath: string;
    onPaginationChange: (total: number, pages: number) => void;
}

export function PendingDischargesQueue({ searchTerm, page, basePath, onPaginationChange }: PendingDischargesQueueProps) {
    const [pendingDischarges, setPendingDischarges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const limit = 6;
    const router = useRouter();

    useEffect(() => {
        fetchPendingDischarges();

        // Real-time refresh on new discharge notification
        const handleNewDischarge = (data: any) => {
            if (data.type === 'discharge_pending') {
                console.log('📡 Real-time update: Refreshing discharge queue');
                fetchPendingDischarges();
            }
        };

        subscribeToSocket('notification:new', handleNewDischarge);

        // Refresh every minute as fallback
        const interval = setInterval(fetchPendingDischarges, 60000);

        return () => {
            clearInterval(interval);
            unsubscribeFromSocket('notification:new', handleNewDischarge);
        };
    }, []);

    const fetchPendingDischarges = async () => {
        try {
            console.log('📡 [QUEUE] Fetching pending discharges...');
            const response = await dischargeService.getPendingDischarges();
            console.log('📡 [QUEUE] Response received:', response);
            if (response.success) {
                setPendingDischarges(response.data);
            } else {
                toast.error('Failed to load pending discharges');
            }
        } catch (error: any) {
            console.error('❌ [QUEUE] Failed to fetch:', error);
            toast.error(`Connection Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessDischarge = (discharge: any) => {
        // Now using admissionId for all pending processing to ensure draft resolution
        // Staying within the current portal (basePath)
        if (basePath.includes('helpdesk')) {
            router.push(`/helpdesk/discharge/process?admissionId=${discharge.admissionId}`);
        } else {
            router.push(`${basePath}?admissionId=${discharge.admissionId}`);
        }
    };

    const filteredDischarges = useMemo(() => {
        let filtered = pendingDischarges;

        // Helpdesk should see discharges prepared by nurses or initiated via IPD/billing
        if (basePath.includes('helpdesk')) {
            filtered = filtered.filter(d => d.status === 'PREPARED_BY_NURSE' || d.status === 'REQUESTED');
        }

        filtered = filtered.filter(d =>
        (d.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.primaryDoctor?.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        return filtered;
    }, [pendingDischarges, searchTerm, basePath]);

    // Update pagination info when filtered results change
    useEffect(() => {
        const total = filteredDischarges.length;
        const pages = Math.ceil(total / limit);
        onPaginationChange(total, pages);
    }, [filteredDischarges, onPaginationChange]);

    const currentDischarges = useMemo(() => {
        return filteredDischarges.slice((page - 1) * limit, page * limit);
    }, [filteredDischarges, page]);

    if (loading) {
        return (
            <Card className="p-6 bg-white/80 backdrop-blur-xl rounded-[2rem] border-white shadow-xl shadow-blue-900/5 min-h-[400px] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
            </Card>
        );
    }

    return (
        <Card className="p-3 sm:p-6 bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-[2rem] border-white shadow-xl shadow-blue-900/5 min-h-[300px] sm:min-h-[500px] space-y-3 sm:space-y-4">
            {currentDischarges.length === 0 ? (
                <div className="text-center py-12 sm:py-24 bg-gray-50/50 rounded-xl sm:rounded-[2rem] border-2 border-dashed border-gray-100">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm text-gray-300">
                        <User size={24} className="sm:size-[32px]" />
                    </div>
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 tracking-tight">Queue Clear</h3>
                    <p className="text-gray-400 text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-1">No pending discharges</p>
                </div>
            ) : (
                <div className="grid gap-2 sm:gap-3">
                    {currentDischarges.map((discharge, index) => (
                        <div
                            key={discharge._id}
                            className="group p-3 sm:p-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                            onClick={() => handleProcessDischarge(discharge)}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-center justify-between gap-3 sm:gap-4">
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm sm:text-base shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        #{(page - 1) * limit + index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors uppercase truncate max-w-[150px] sm:max-w-none">
                                            {discharge.patientName}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 mt-0.5">
                                            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">MRN: <span className="text-gray-600">{discharge.mrn}</span></p>
                                            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden xs:block">Doc: <span className="text-gray-600 truncate max-w-[60px] inline-block align-middle">{discharge.primaryDoctor}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-6">
                                    <div className="hidden sm:flex flex-col items-end text-right">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-widest group-hover:bg-blue-50 transition-colors">
                                            <Clock size={10} className="text-blue-400" />
                                            {new Date(discharge.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-900 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black hover:bg-blue-600 transition-all uppercase tracking-widest shadow-sm group-hover:shadow-blue-200">
                                        <span className="hidden xs:inline">PROCESS</span>
                                        <ArrowRight size={12} className="sm:size-[14px]" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
