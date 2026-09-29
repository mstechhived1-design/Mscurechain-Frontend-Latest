import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEditTransaction } from '@/lib/integrations/hooks/useHelpdeskQueries';

interface EditTransactionModalProps {
    tx: any;
    onClose: () => void;
}

export default function EditTransactionModal({ tx, onClose }: EditTransactionModalProps) {
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

        const payload: any = {
            type: tx?.type,
            referenceId: refId,
            paymentMode: paymentMode.toLowerCase(),
            reason: reason.trim()
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
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to update transaction');
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Edit Transaction</h3>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
                            Ref: {tx._id?.substring(0, 8)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Warning Banner */}
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Audit Trail Active</h4>
                            <p className="text-[10px] font-medium text-amber-600 mt-0.5">
                                All edits are permanently logged with your credentials for compliance purposes.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Mode</label>
                        <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="due">Due</option>
                            <option value="mixed">Mixed</option>
                        </select>
                    </div>

                    {paymentMode === 'mixed' && (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Split Payment Details</label>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total: ₹{totalAmount}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={mixedPayments.cash || ''}
                                        onChange={(e) => setMixedPayments({ ...mixedPayments, cash: Number(e.target.value) })}
                                        placeholder="0"
                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPI</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={mixedPayments.upi || ''}
                                        onChange={(e) => setMixedPayments({ ...mixedPayments, upi: Number(e.target.value) })}
                                        placeholder="0"
                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={mixedPayments.card || ''}
                                        onChange={(e) => setMixedPayments({ ...mixedPayments, card: Number(e.target.value) })}
                                        placeholder="0"
                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
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
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason for Edit <span className="text-rose-500">*</span></label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Entered fastly under cash instead of UPI"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none h-24"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors tracking-wide uppercase"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20 hover:shadow-md hover:shadow-indigo-600/30 disabled:opacity-50 tracking-wide uppercase"
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
