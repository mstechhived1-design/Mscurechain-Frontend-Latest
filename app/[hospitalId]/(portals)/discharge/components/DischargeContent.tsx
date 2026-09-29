'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DischargeSummaryForm } from './DischargeSummaryForm';
import { PendingDischargesQueue } from './PendingDischargesQueue';
import { ClipboardList, History, ArrowLeft, Search, ChevronLeft, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

export function DischargeContent() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const admissionId = ((searchParams?.get('admissionId') ?? null) ?? null);
    const recordId = ((searchParams?.get('id') ?? null) ?? null);
    const mode = ((searchParams?.get('mode') ?? null) ?? null);
    const isEditingOrCreating = admissionId || recordId || mode === 'sample';

    // Lifted state for Pending Queue
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Verify user data for expiry check
    const { user } = useAuthStore();
    const [expiryAlert, setExpiryAlert] = React.useState<{ message: string; type: 'critical' | 'warning' } | null>(null);

    // Determine base path for redirects (e.g. /nurse/discharge or /helpdesk/discharge)
    const getBasePath = () => {
        if (user?.role === 'nurse') return '/nurse/discharge';
        if (user?.role === 'helpdesk') return '/helpdesk/discharge';
        return '/discharge';
    };

    const basePath = getBasePath();

    React.useEffect(() => {
        if (user) {
            if ((user as any).qualificationDetails?.licenseValidityDate) {
                checkLicenseValidity((user as any).qualificationDetails.licenseValidityDate);
            } else if ((user as any).licenseValidityDate) {
                checkLicenseValidity((user as any).licenseValidityDate);
            }
        }
    }, [user]);

    const checkLicenseValidity = (date: any) => {
        const validityDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        validityDate.setHours(0, 0, 0, 0);

        const diffTime = validityDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            setExpiryAlert({
                message: 'Your license expires today! please renewal it.',
                type: 'critical'
            });
        } else if (diffDays === 30) {
            setExpiryAlert({
                message: `Your license will expire in ${diffDays} days ! please renewal it.`,
                type: 'warning'
            });
        }
    };

    return (
        <div className="min-h-screen bg-transparent">
            <div className="w-full py-4 space-y-5">

                {/* LICENSE EXPIRY ALERT */}
                {expiryAlert && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${expiryAlert.type === 'critical'
                        ? 'bg-rose-50 border-rose-100 text-rose-700'
                        : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                        <div className={`p-2 rounded-full ${expiryAlert.type === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                            <RefreshCw size={18} className={expiryAlert.type === 'critical' ? 'animate-pulse' : ''} />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm">{expiryAlert.type === 'critical' ? 'Action Required' : 'Renewal Reminder'}</p>
                            <p className="text-xs font-semibold opacity-90">{expiryAlert.message}</p>
                        </div>
                    </div>
                )}

                {/* CONSOLIDATED HEADER & CONTROLS */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 pt-2">
                        <div className="flex items-center gap-3">
                            {isEditingOrCreating ? (
                                <button
                                    onClick={() => router.push(basePath)}
                                    className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                                    title="Back to Queue"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            ) : (
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <ClipboardList size={24} />
                                </div>
                            )}
                            <div>
                                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">
                                    {isEditingOrCreating ? 'Discharge Summary' : 'Discharge Queue'}
                                </h1>
                                {!isEditingOrCreating && (
                                    <p className="text-[7px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
                                        {totalItems} Pending Discharges
                                    </p>
                                )}
                            </div>
                        </div>

                        {!isEditingOrCreating && (
                            <div className="flex items-center gap-3">
                                <div className="relative w-full md:w-80 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="SEARCH NAME / MRN..."
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                                    />
                                </div>

                                {/* COMPACT PAGINATION */}
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all active:scale-90"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white rounded-md shadow-sm border border-slate-100 min-w-[55px] text-center">
                                        {page} / {totalPages || 1}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages || totalPages === 0}
                                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all active:scale-90"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Link
                                href={`${basePath}?mode=sample`}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl font-bold text-blue-600 hover:bg-blue-100 transition-all text-[10px] uppercase tracking-wider"
                            >
                                <Plus size={16} />
                                VIEW SAMPLE
                            </Link>
                            <Link
                                href={`${basePath}/history`}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all text-[10px] uppercase tracking-wider shadow-sm"
                            >
                                <History size={16} />
                                HISTORY
                            </Link>
                        </div>
                    </div>
                </div>

                {isEditingOrCreating ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <DischargeSummaryForm />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PendingDischargesQueue
                            searchTerm={searchTerm}
                            page={page}
                            basePath={basePath}
                            onPaginationChange={(total, pages) => {
                                setTotalItems(total);
                                setTotalPages(pages);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
