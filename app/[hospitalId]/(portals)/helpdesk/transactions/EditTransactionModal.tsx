import React, { useState } from 'react';
import { X, Save, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEditTransaction } from '@/lib/integrations/hooks/useHelpdeskQueries';
import { clearApiCache } from '@/lib/integrations/api/apiClient';

interface EditTransactionModalProps {
    tx: any;
    onClose: () => void;
}

export default function EditTransactionModal({ tx, onClose }: EditTransactionModalProps) {
    const formatDateForInput = (d: string | Date | undefined) => {
        if (!d) return "";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "";
        const pad = (n: number) => String(n).padStart(2, "0");
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [txDate, setTxDate] = useState<string>(formatDateForInput(tx?.date || tx?.createdAt || new Date()));
    const [paymentMode, setPaymentMode] = useState(tx?.paymentMethod || tx?.paymentMode || 'cash');
    const [reason, setReason] = useState('');
    const [mixedPayments, setMixedPayments] = useState({
        cash: tx?.paymentDetails?.cash || 0,
        upi: tx?.paymentDetails?.upi || 0,
        card: tx?.paymentDetails?.card || 0
    });
    const { mutate: editTransaction, isPending } = useEditTransaction();

    const totalAmount = tx?.payment?.amount || tx?.amount || 0;

    const handleSave = () => {
        if (isPending) return;

        if (!reason.trim()) {
            toast.error('Reason for editing is required');
            return;
        }

        if (paymentMode === 'mixed') {
            const sum = Number(mixedPayments.cash) + Number(mixedPayments.upi) + Number(mixedPayments.card);
            if (sum !== totalAmount) {
                toast.error(`Total split amount (₹${sum}) must equal the transaction amount (₹${totalAmount})`);
                return;
            }
        }

        const refId = typeof tx?.referenceId === 'object' && tx?.referenceId?._id
            ? tx.referenceId._id
            : (tx?.referenceId || tx?._id || tx?.id);

        const targetId = tx?._id || tx?.id || refId;
        const isoDate = txDate ? new Date(txDate).toISOString() : new Date().toISOString();

        const payload: any = {
            type: tx?.type,
            referenceId: refId,
            paymentMode: paymentMode.toLowerCase(),
            reason: reason.trim(),
            date: isoDate,
            createdAt: isoDate,
        };

        if (paymentMode === 'mixed') {
            payload.paymentDetails = {
                cash: Number(mixedPayments.cash || 0),
                upi: Number(mixedPayments.upi || 0),
                card: Number(mixedPayments.card || 0)
            };
        }

        editTransaction(
            { id: targetId, payload },
            {
                onSuccess: () => {
                    toast.success('Transaction updated successfully');
                    clearApiCache();
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent('billUpdated', { detail: { txId: targetId, payload } }));
                        window.dispatchEvent(new CustomEvent('refresh-transaction-data'));
                        try {
                            const ch = new BroadcastChannel('msc_billing_channel');
                            ch.postMessage({ type: 'BILL_UPDATED', txId: targetId });
                            ch.close();
                        } catch {}
                    }
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to update transaction');
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-blue-100">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider">Edit Transaction</h3>
                        <p className="text-[10px] font-medium text-blue-100 uppercase tracking-widest mt-0.5">
                            Ref: {tx._id?.substring(0, 8)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Warning Banner */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                        <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Audit Trail Active</h4>
                            <p className="text-[10px] font-medium text-blue-700 mt-0.5">
                                All edits are synchronized across all portals immediately without page refresh.
                            </p>
                        </div>
                    </div>

                    {/* Date and Time Option */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={12} className="text-blue-600" />
                            Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-blue-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Payment Mode</label>
                        <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="due">Due</option>
                            <option value="mixed">Mixed</option>
                        </select>
                    </div>

                    {paymentMode === 'mixed' && (
                        <div className="space-y-2 bg-blue-50/40 p-3 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Split Payment Details</label>
                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Total: ₹{totalAmount}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={mixedPayments.cash || ''}
                                        onChange={(e) => setMixedPayments({ ...mixedPayments, cash: Number(e.target.value) })}
                                        placeholder="0"
                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPI</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={mixedPayments.upi || ''}
                                        onChange={(e) => setMixedPayments({ ...mixedPayments, upi: Number(e.target.value) })}
                                        placeholder="0"
                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={mixedPayments.card || ''}
                                        onChange={(e) => setMixedPayments({ ...mixedPayments, card: Number(e.target.value) })}
                                        placeholder="0"
                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            {Number(mixedPayments.cash) + Number(mixedPayments.upi) + Number(mixedPayments.card) !== totalAmount && (
                                <p className="text-[10px] font-medium text-rose-500 mt-2">
                                    Sum (₹{Number(mixedPayments.cash) + Number(mixedPayments.upi) + Number(mixedPayments.card)}) does not match total (₹{totalAmount})
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Reason for Edit <span className="text-rose-500">*</span></label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Corrected payment mode or date"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-20"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors tracking-wide uppercase"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 rounded-xl transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50 tracking-wide uppercase"
                    >
                        {isPending ? 'Saving...' : (
                            <>
                                <Save size={14} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
