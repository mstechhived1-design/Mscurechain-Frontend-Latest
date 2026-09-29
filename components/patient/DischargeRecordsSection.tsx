'use client';

import React, { useState, useEffect } from 'react';
import { FileCheck, Calendar, User, MapPin, Loader2, Eye, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface DischargeRecord {
    _id: string;
    documentId?: string;
    admissionId: string;
    patientName: string;
    mrn: string;
    diagnosis?: string;
    dischargeDate?: string;
    followUpDate?: string;
    primaryDoctor?: string;
    hospitalName?: string;
    hospitalAddress?: string;
}

interface DischargeRecordsSectionProps {
    records: DischargeRecord[];
}

export default function DischargeRecordsSection({ records = [] }: DischargeRecordsSectionProps) {
    const router = useRouter();

    const handleViewRecord = (record: DischargeRecord) => {
        const identifier = record.documentId || record.admissionId || record._id;
        router.push(`/patient/discharge/${identifier}`);
    };

    if (records.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileCheck className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Discharge Records</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">You don't have any discharge summaries yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 px-1">
                <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Discharge Records
                    </h2>
                    <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Your hospital discharge summaries
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <FileCheck className="w-3 h-3" />
                    <span>{records.length} Record{records.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
                {records.map((record) => (
                    <div
                        key={record._id}
                        className="group bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer"
                        onClick={() => handleViewRecord(record)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-red-600 shrink-0">
                                        <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-base uppercase tracking-tight truncate">
                                            Discharge Summary
                                        </h3>
                                        <p className="text-xs sm:text-sm font-black font-mono text-red-600 tracking-wider">
                                            #{record.documentId || record.admissionId?.slice(-8).toUpperCase() || record._id.slice(-8).toUpperCase()}
                                        </p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3">
                                    {record.dischargeDate && (
                                        <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                            <Calendar className="w-3 h-3 text-red-600 shrink-0" />
                                            <div>
                                                <span className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Discharge Date</span>
                                                <span className="font-black text-gray-900 dark:text-white uppercase">
                                                    {format(new Date(record.dischargeDate), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {record.primaryDoctor && (
                                        <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                            <User className="w-3 h-3 text-red-600 shrink-0" />
                                            <div>
                                                <span className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Doctor</span>
                                                <span className="font-black text-gray-900 dark:text-white uppercase truncate">
                                                    {record.primaryDoctor}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {record.diagnosis && (
                                        <div className="col-span-full">
                                            <span className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Diagnosis</span>
                                            <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-2">
                                                {record.diagnosis}
                                            </p>
                                        </div>
                                    )}

                                    {record.followUpDate && (
                                        <div className="col-span-full bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                            <span className="text-[7px] sm:text-[8px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Follow-up Date</span>
                                            <span className="text-[10px] sm:text-xs font-black text-amber-900 dark:text-amber-300 uppercase">
                                                {format(new Date(record.followUpDate), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* View Button */}
                            <button
                                className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewRecord(record);
                                }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
