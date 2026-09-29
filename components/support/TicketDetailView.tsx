'use client';

import React, { useState, useEffect } from 'react';
import { supportService } from '@/lib/integrations/services/support.service';
import { SupportTicket } from '@/lib/integrations/types/support';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Send, Clock, Paperclip, User, ShieldCheck, X } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';

interface TicketDetailViewProps {
    ticketId: string;
    isAdmin?: boolean;
    onBack: () => void;
}

function TicketDetailView({ ticketId, isAdmin, onBack }: TicketDetailViewProps) {
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyMessage, setReplyMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [replyFiles, setReplyFiles] = useState<File[]>([]);
    const [resolving, setResolving] = useState(false);
    const [viewImage, setViewImage] = useState<string | null>(null);

    const fetchTicket = React.useCallback(async () => {
        try {
            const data = await supportService.getTicketDetails(ticketId);
            console.log("Fetched Ticket Data:", data); // Debug Log
            if (data.attachments) {
                console.log("Attachments:", data.attachments);
            }
            setTicket(data);
        } catch {
            toast.error("Failed to load ticket details");
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        fetchTicket();
    }, [fetchTicket]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        setSending(true);
        const formData = new FormData();
        formData.append('message', replyMessage);

        replyFiles.forEach(file => {
            formData.append('attachments', file);
        });

        try {
            await supportService.replyToTicket(ticketId, formData);
            toast.success("Reply sent");
            setReplyMessage('');
            setReplyFiles([]);
            fetchTicket(); // Refresh conversation
        } catch {
            toast.error("Failed to send reply");
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        const action = newStatus === 'resolved' ? 'mark this ticket as resolved' : 're-open this ticket';
        if (!confirm(`Are you sure you want to ${action}?`)) return;

        setResolving(true);
        try {
            await supportService.updateStatus(ticketId, newStatus);
            toast.success(`Ticket ${newStatus === 'resolved' ? 'resolved' : 're-opened'}`);
            fetchTicket();
        } catch {
            toast.error("Action failed");
        } finally {
            setResolving(false);
        }
    };

    if (loading) return <div className="p-20 text-center text-gray-400">Loading details...</div>;
    if (!ticket) return <div className="p-20 text-center text-red-400">Ticket not found</div>;

    return (
        <div className="space-y-6 md:space-y-8 pb-24">
            {viewImage && <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 pb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-gray-800 rounded-lg text-slate-400 hover:text-teal-600 transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Support Operations / Assistance Node</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Clinical Assistance Stream
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={ticket.status} className="px-4 py-1.5" />
                    {isAdmin && (
                        <button
                            onClick={() => handleStatusChange(ticket.status === 'resolved' ? 'open' : 'resolved')}
                            disabled={resolving}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 text-white transition-colors ${ticket.status === 'resolved'
                                ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-black'
                                : 'bg-teal-600 hover:bg-teal-700'
                                }`}
                        >
                            {resolving ? 'Syncing...' : (ticket.status === 'resolved' ? 'Re-open Channel' : 'Mark Resolved')}
                        </button>
                    )}
                </div>
            </div>

            {/* Ticket Info Card */}
            <div className="p-5 md:p-8 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm space-y-6 md:space-y-8">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase mb-3 leading-snug">{ticket.subject}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="font-mono text-slate-500 bg-slate-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded">ID: #{ticket._id.slice(-6).toUpperCase()}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>CATEGORY: {ticket.category}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{format(new Date(ticket.createdAt), 'PPP p')}</span>
                    </div>
                    {/* Hospital Origin */}
                    {(ticket as any).hospital?.name && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                From: {(ticket as any).hospital.name}
                                {(ticket as any).hospital.hospitalId && <span className="font-mono text-indigo-400 ml-1">({(ticket as any).hospital.hospitalId})</span>}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4 p-5 bg-transparent rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm relative font-sans">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex items-center justify-center text-teal-600 shrink-0 shadow-sm">
                        <User size={20} />
                    </div>
                    <div className="space-y-3 flex-1 min-w-0">
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">{ticket.requester?.name || ticket.name || 'Unknown User'}</p>
                            <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest">{ticket.requester?.role || ticket.role || 'N/A'}</p>
                        </div>
                        <p className="text-slate-600 dark:text-gray-300 text-[11px] md:text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">{ticket.message}</p>

                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="pt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {ticket.attachments.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setViewImage(url)}
                                        className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 hover:border-teal-500 cursor-zoom-in shrink-0 transition-all"
                                    >
                                        <img src={url} alt="attachment" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Conversation History */}
            <div className="space-y-6 px-2 md:px-4">
                {ticket.replies?.map((reply, index) => {
                    const isSupportReply = ['admin', 'super-admin'].includes(reply.sender?.role || '');
                    const isMe = isAdmin ? isSupportReply : !isSupportReply;

                    return (
                        <div key={index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${itemRoleColor(reply.sender?.role || 'user')} text-white shadow-sm mt-auto`}>
                                {isSupportReply ? <ShieldCheck size={14} /> : <User size={14} />}
                            </div>
                            <div className={`max-w-[85%] sm:max-w-[70%] p-4 md:p-5 rounded-2xl shadow-sm font-sans ${isMe
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-black rounded-br-none'
                                : 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-bl-none'
                                }`}>
                                <div className="flex justify-between items-center gap-4 mb-2">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isMe ? 'text-slate-400 dark:text-gray-500' : 'text-slate-400'}`}>
                                        {reply.sender?.name || 'Unknown'} ({reply.sender?.role || 'N/A'})
                                    </span>
                                </div>
                                <p className={`text-[11px] md:text-xs font-medium leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'text-slate-100 dark:text-gray-800' : 'text-slate-600 dark:text-gray-300'}`}>
                                    {reply.message}
                                </p>
                                {reply.attachments && reply.attachments.length > 0 && (
                                    <div className={`mt-4 flex flex-wrap gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {reply.attachments.map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setViewImage(url)}
                                                className={`w-14 h-14 rounded-lg overflow-hidden border ${isMe ? 'border-slate-800' : 'border-slate-100 dark:border-gray-700'} hover:scale-105 transition-transform`}
                                            >
                                                <img src={url} alt="attachment" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className={`text-[8px] font-bold text-right mt-2 ${isMe ? 'text-slate-500' : 'text-slate-300'}`}>
                                    {format(new Date(reply.createdAt), 'p')}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Reply Input Area */}
            {ticket.status !== 'resolved' && (
                <div className="bg-white dark:bg-gray-900 p-2 md:p-3 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 sticky bottom-4 md:bottom-6 z-20 mx-2 md:mx-0">

                    {/* File Previews */}
                    {replyFiles.length > 0 && (
                        <div className="flex gap-3 px-4 pt-3 pb-2 overflow-x-auto border-b border-gray-50 dark:border-gray-800 mb-1">
                            {replyFiles.map((file, i) => (
                                <div key={i} className="relative group shrink-0 animate-in zoom-in-95">
                                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="preview"
                                            className="w-full h-full object-cover opacity-80"
                                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setReplyFiles(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-sm hover:scale-110 transition-transform"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-2 p-1">
                        <label className="p-3 md:p-4 text-gray-400 hover:text-blue-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <Paperclip size={20} />
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const newFiles = Array.from(e.target.files);
                                        if (replyFiles.length + newFiles.length > 3) {
                                            toast.error("Max 3 images allowed");
                                            return;
                                        }
                                        setReplyFiles(prev => [...prev, ...newFiles]);
                                        e.target.value = ''; // Reset input
                                    }
                                }}
                            />
                        </label>

                        <div className="flex-1 py-3">
                            <textarea
                                className="w-full bg-transparent border-none outline-none text-xs md:text-sm font-medium text-slate-900 dark:text-white placeholder:text-gray-400 resize-none max-h-32"
                                placeholder="Type your clinical update..."
                                rows={1}
                                value={replyMessage}
                                onChange={(e) => {
                                    setReplyMessage(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply(e)}
                            />
                        </div>

                        <button
                            onClick={handleReply}
                            disabled={sending || (!replyMessage.trim() && replyFiles.length === 0)}
                            className="p-3 md:p-4 bg-teal-600 text-white rounded-[1.2rem] hover:bg-teal-700 disabled:opacity-50 active:scale-95 shadow-lg shadow-teal-900/20 transition-all flex mb-1 items-center justify-center min-w-[3rem]"
                        >
                            {sending ? <Clock size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function isAdminRole(role: string) {
    return ['admin', 'super-admin'].includes(role);
}

function itemRoleColor(role: string) {
    if (isAdminRole(role)) return 'bg-slate-900 dark:bg-white dark:text-black';
    if (role === 'doctor') return 'bg-teal-600';
    if (role === 'hospital-admin') return 'bg-indigo-600';
    return 'bg-slate-400';
}

interface ImageViewerProps {
    src: string;
    onClose: () => void;
}

function ImageViewer({ src, onClose }: ImageViewerProps) {
    if (!src) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent animate-in fade-in duration-200" onClick={onClose}>
            <div className="relative max-w-5xl max-h-[90vh] w-full p-4 flex items-center justify-center">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
                <img
                    src={src}
                    alt="Full View"
                    className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}

export default React.memo(TicketDetailView);
