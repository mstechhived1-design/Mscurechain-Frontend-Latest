"use client";

import React, { useEffect, useState } from 'react';
import { subscribeToSocket, unsubscribeFromSocket } from '@/lib/integrations/api/socket';
import { Card } from '@/components/admin';
import { MessageSquare, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LiveFeedbackWidget() {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);

    useEffect(() => {
        const handleNewFeedback = (data: any) => {
            // Play a subtle sound? Maybe too much.
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-2 md:p-4">
                        <div className="flex items-start">
                            <div className="shrink-0 pt-0.5">
                                <Star className="h-10 w-10 text-amber-400 fill-amber-400" />
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    New {data.rating} Star Feedback!
                                </p>
                                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                    "{data.comment}"
                                </p>
                                <p className="mt-1 text-xs text-blue-500 font-bold">
                                    - {data.patientName}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ), { duration: 5000 });

            setFeedbacks(prev => [data, ...prev].slice(0, 5));
        };

        // Subscribe
        subscribeToSocket('new_feedback', handleNewFeedback);

        return () => {
            unsubscribeFromSocket('new_feedback', handleNewFeedback);
        };
    }, []);

    return (
        <Card className="p-2 md:p-6 border-slate-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <MessageSquare size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live Feedback Stream</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Monitoring</span>
                </div>
            </div>

            {feedbacks.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Waiting for live feedback...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feedbacks.map((fb, i) => (
                        <div key={fb._id || i} className="p-2 md:p-4 bg-slate-50 border border-slate-100 rounded-xl transition-all">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, idx) => (
                                        <Star
                                            key={idx}
                                            size={10}
                                            className={idx < fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                                        />
                                    ))}
                                </div>
                                <span className="text-[9px] uppercase font-bold text-slate-400">{fb.category}</span>
                            </div>
                            <p className="text-sm text-slate-700 font-medium italic mb-2">"{fb.comment}"</p>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{fb.patientName}</span>
                                <span className="text-[10px] text-slate-300">Just now</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
