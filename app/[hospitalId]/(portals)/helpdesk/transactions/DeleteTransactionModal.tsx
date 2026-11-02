'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeleteTransaction } from '@/lib/integrations/hooks/useHelpdeskQueries';

interface DeleteTransactionModalProps {
    tx: any;
    patientName?: string;
    onClose: () => void;
    onSuccess?: (deletedTx: any) => void;
}

export default function DeleteTransactionModal({
    tx,
    patientName,
    onClose,
    onSuccess,
}: DeleteTransactionModalProps) {
    const [reason, setReason] = useState('Duplicate billing entry');
    const { mutate: deleteTransaction, isPending } = useDeleteTransaction();

    const displayId =
        tx?.invoiceNumber ||
        tx?.receiptNumber ||
        tx?.transactionId ||
        tx?.referenceId?.sampleId ||
        tx?.referenceId?.orderId ||
        tx?.referenceId?.transactionId ||
        tx?._id?.substring(0, 8) ||
        'N/A';

    const amount = Number(tx?.payment?.amount || tx?.amount || 0);
    const serviceName =
        tx?.referenceId?.testName ||
        tx?.referenceId?.tests?.map((t: any) => t.name || t.testName).filter(Boolean).join(', ') ||
        tx?.referenceId?.reason ||
        tx?.clinicalDetail ||
        'Medical Service';

    const paymentMode = (tx?.paymentMethod || tx?.paymentMode || 'CASH').toUpperCase();

    const handleDelete = () => {
        if (isPending) return;

        const refId =
            typeof tx?.referenceId === 'object' && tx?.referenceId?._id
                ? tx.referenceId._id
                : (tx?.referenceId || tx?._id || tx?.id);

        const targetId = tx?._id || tx?.id || refId;

        const payload = {
            type: tx?.type,
            referenceId: refId,
            reason: reason.trim() || 'Deleted by Helpdesk User',
            invoiceNumber: tx?.invoiceNumber || tx?.receiptNumber,
        };

        // ⚡ INSTANT 0MS OPTIMISTIC REMOVAL: Update UI and close modal immediately
        if (onSuccess) onSuccess(tx);
        onClose();

        deleteTransaction(
            { id: targetId, payload },
            {
                onSuccess: () => {
                    toast.success(`Transaction ${displayId} deleted successfully`);
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to delete transaction');
                },
            }
        );
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isPending) onClose();
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-rose-100 transform transition-all animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Warning Accent */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-rose-50/40">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm border border-rose-200/60 shrink-0">
                            <AlertTriangle size={20} className="animate-pulse" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                            </span>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 tracking-tight">
                                Delete Transaction Record
                            </h3>
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-0.5">
                                High-Priority Action
                            </p>
                        </div>
                    </div>
                    {!isPending && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                    {/* Transaction Card to be deleted */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Patient
                            </span>
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[9px] font-black uppercase">
                                ID: {displayId}
                            </span>
                        </div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                            {patientName || tx?.patientName || 'Patient'}
                        </p>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Service / Test
                                </p>
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-tight truncate max-w-[190px]">
                                    {serviceName}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Amount
                                </p>
                                <p className="text-sm font-black text-rose-600">
                                    ₹{amount.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>

                        <div className="text-[8.5px] font-semibold text-slate-500 uppercase flex items-center justify-between pt-1">
                            <span>Payment Mode: <strong>{paymentMode}</strong></span>
                            <span>Status: <strong className="text-emerald-600">COMPLETED</strong></span>
                        </div>
                    </div>

                    {/* Critical Warning Alert Box */}
                    <div className="flex items-start gap-2.5 p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                        <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-[11px] leading-relaxed text-amber-900">
                            <strong className="font-bold">Are you sure you want to delete this bill?</strong>
                            <p className="text-[10.5px] text-amber-700 mt-0.5">
                                This will permanently remove the record from ledger transactions and audit totals. This action cannot be reversed.
                            </p>
                        </div>
                    </div>

                    {/* Deletion Reason */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Reason for deletion (Audit record)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Duplicate bill entry, incorrect amount"
                            className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all border border-slate-200 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 size={14} />
                                <span>Yes, Delete Transaction</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
