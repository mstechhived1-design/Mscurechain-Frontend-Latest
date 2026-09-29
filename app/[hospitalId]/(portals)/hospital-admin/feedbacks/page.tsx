"use client";

import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '@/lib/integrations/services/feedback.service';
import { useAuthStore } from '@/stores/authStore';
import { MessageSquare, Star, Quote, Loader, User, XCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function FeedbacksPage() {
    const user = useAuthStore(state => state.user);
    const hospitalId = (user as any)?.hospital || (user as any)?.hospitalId;
    const queryClient = useQueryClient();

    const [page, setPage] = React.useState(1);

    // Reset page when hospital changes
    React.useEffect(() => setPage(1), [hospitalId]);

    const { data: feedbackData, isLoading, error } = useQuery({
        queryKey: ['feedbacks', hospitalId, page],
        queryFn: () => feedbackService.getFeedbacks(hospitalId, page, 15), // Limit 5 per page
        enabled: !!hospitalId,
        placeholderData: (previousData) => previousData, // keep showing old data while fetching new
    });

    // Real-time updates
    React.useEffect(() => {
        if (!user || !hospitalId) return;

        const handleNewFeedback = (data: any) => {
            // Play a subtle notification sound if desired, or just toast
            toast.success("New feedback received!", { icon: '🔔' });
            queryClient.invalidateQueries({ queryKey: ['feedbacks', hospitalId] });
        };

        // 1. Join Room
        import('@/lib/integrations/api/socket').then(({ joinSocketRoom, subscribeToSocket, unsubscribeFromSocket }) => {
            joinSocketRoom({
                userId: user.id || (user as any)._id,
                role: user.role,
                hospitalId: hospitalId
            });

            // 2. Subscribe
            subscribeToSocket('new_feedback', handleNewFeedback);

            // Cleanup
            return () => {
                unsubscribeFromSocket('new_feedback', handleNewFeedback);
            };
        });
    }, [user, hospitalId, queryClient]);

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            feedbackService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedbacks', hospitalId] });
            toast.success("Feedback status updated");
        },
        onError: () => toast.error("Failed to update status")
    });

    const deleteFeedbackMutation = useMutation({
        mutationFn: (id: string) => feedbackService.deleteFeedback(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedbacks', hospitalId] });
            toast.success("Feedback deleted successfully");
        },
        onError: () => toast.error("Failed to delete feedback")
    });

    const feedbacks = useMemo(() => {
        return (feedbackData as any)?.data || [];
    }, [feedbackData]);

    const pagination = useMemo(() => {
        return (feedbackData as any)?.pagination || { page: 1, limit: 15, total: 0, pages: 1 };
    }, [feedbackData]);

    const averageRating = useMemo(() => {
        if (!feedbacks.length) return 0;
        const sum = feedbacks.reduce((acc: number, curr: any) => acc + curr.rating, 0);
        return (sum / feedbacks.length).toFixed(1);
    }, [feedbacks]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-slate-500">Loading feedbacks...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-3 md:p-8 text-center bg-red-50 text-red-600 rounded-xl">
                Failed to load feedbacks. Could be a network issue.
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Dynamic Header */}
            <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">

                {/* Top Row: Title, Minibadges */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">

                    <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
                        <div className="shrink-0 flex items-center gap-2 px-1">
                            <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                                <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                    Patient Feedbacks
                                </h1>
                                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                                    Manage and review patient satisfaction and concerns
                                </p>
                            </div>
                        </div>

                        {feedbacks.length > 0 && (
                            <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-100">
                                {[
                                    { label: "Total Feedbacks", value: feedbacks.length, color: "text-gray-900", bg: "bg-gray-100" },
                                    { label: "Avg Rating", value: `${averageRating} ★`, color: "text-blue-600", bg: "bg-blue-50" }
                                ].map((stat, i) => (
                                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${stat.bg} ${stat.color} border border-slate-100/50`}>
                                        <span className="text-[8px] font-bold uppercase tracking-widest">{stat.label}</span>
                                        <span className="text-xs font-black">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Feedbacks Grid */}
            <div className="grid grid-cols-1 gap-4">
                {feedbacks.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                        <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-sm md:text-lg font-bold text-slate-900">No Feedbacks Yet</h3>
                        <p className="text-slate-500">Patient reviews and ratings will appear here.</p>
                    </div>
                ) : (
                    feedbacks.map((fb: any) => (
                        <div key={fb._id} className={`group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border-y border-r border-slate-100 overflow-hidden relative
                            ${fb.status === 'Resolved' ? 'border-l-4 border-l-emerald-500' :
                                fb.status === 'In Progress' ? 'border-l-4 border-l-blue-500' :
                                    fb.status === 'Closed' ? 'border-l-4 border-l-slate-300' :
                                        'border-l-4 border-l-amber-500'
                            }`}
                        >
                            <div className="p-5">
                                {/* Top Row: User & Meta */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-sm ${fb.isAnonymous
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-primary-theme text-white'
                                            }`}>
                                            {fb.isAnonymous ? <User size={18} /> : (fb.patientName?.[0] || 'P')}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 leading-tight">
                                                {fb.isAnonymous ? 'Anonymous Patient' : fb.patientName}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {fb.patient?.mrn && (
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded">
                                                        {fb.patient.mrn}
                                                    </span>
                                                )}
                                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                <span className="text-[11px] text-slate-500">
                                                    {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Header */}
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {/* Status Pill */}
                                        <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${fb.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            fb.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                fb.status === 'Closed' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {fb.status}
                                        </div>

                                        {/* Fixed: Always visible actions, and positioned better for mobile */}
                                        <div className="flex items-center gap-1 justify-end w-full">
                                            {fb.status !== 'Closed' && (
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ id: fb._id, status: 'Closed' })}
                                                    className="p-1 md:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Close Feedback"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to delete this feedback?")) {
                                                        deleteFeedbackMutation.mutate(fb._id);
                                                    }
                                                }}
                                                className="p-1 md:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Block */}
                                <div className="pl-0 md:pl-[52px]"> {/* Adjust alignment for mobile */}

                                    {/* Rating & Categories */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={14}
                                                    className={`${i < fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 ml-2">
                                            {Array.isArray(fb.category) ? fb.category.map((cat: string) => (
                                                <span key={cat} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    {cat}
                                                </span>
                                            )) : (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    {fb.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comment */}
                                    <div className="relative">
                                        <Quote className="absolute -top-1 -left-4 text-slate-200 transform scale-75 -scale-x-100 opacity-50" />
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                            {fb.comment}
                                        </p>
                                    </div>

                                    {/* Footer Attended By */}
                                    {fb.doctor && (
                                        <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                                Attended by <span className="font-bold text-slate-700">{fb.doctor.firstName?.startsWith('Dr.') ? `${fb.doctor.firstName} ${fb.doctor.lastName}` : `Dr. ${fb.doctor.firstName} ${fb.doctor.lastName}`}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                        Showing page <span className="font-bold">{pagination.page}</span> of <span className="font-bold">{pagination.pages}</span> ({pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
