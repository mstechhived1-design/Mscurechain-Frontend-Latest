'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, Inbox, User, FlaskConical, Stethoscope, Wallet, Trash2, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useParams } from 'next/navigation';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';

interface LabNotification {
    id: string;
    patientName: string;
    sampleId: string;
    doctorName: string;
    price: number;
    createdAt: string;
    isRead: boolean;
    type: 'new_order' | 'update';
    priority?: string;
    clinicalAnnotations?: string;
}

const LabNotificationPanel = () => {
    const [notifications, setNotifications] = useState<LabNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuthStore();
    const params = useParams() as any;
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;
        // Store callback ref so we can unsubscribe on cleanup
        let unsubscribe: (() => void) | null = null;

        const initSocket = async () => {
            // Initial fetch of pending samples to show as recent notifications
            try {
                const pendingSamples = await LabSampleService.getSamples('Pending', true);
                if (isMounted) {
                    const initialNotifs: LabNotification[] = pendingSamples.slice(0, 10).map(order => ({
                        id: order._id,
                        patientName: order.patientDetails?.name || 'Unknown Patient',
                        sampleId: order.sampleId || 'N/A',
                        doctorName: order.patientDetails?.refDoctor || 'Unknown Doctor',
                        price: order.tests.reduce((acc, test) => acc + (test.price || 0), 0),
                        createdAt: order.createdAt || new Date().toISOString(),
                        isRead: false, // Show as unread on load so count appears
                        type: 'new_order',
                        priority: order.priority || 'routine',
                        clinicalAnnotations: order.clinicalAnnotations || ''
                    }));
                    setNotifications(initialNotifs);
                }
            } catch (err) {
                console.error('Failed to fetch initial pending samples:', err);
            }

            try {
                const { subscribeToSocket, unsubscribeFromSocket } = await import('@/lib/integrations/api/socket');

                // Named callback so it can be removed in cleanup
                const onNewLabOrder = async (data: any) => {
                    console.log('🔔 [LabNotification] New order event received:', data);
                    if (!isMounted) return;
                    const orderId = data.orderId || data._id;
                    if (!orderId) return;

                    try {
                        // Fetch full order details since socket might only send ID
                        const fullOrder = await LabSampleService.getSampleById(orderId, true);

                        const newNotif: LabNotification = {
                            id: fullOrder._id,
                            patientName: fullOrder.patientDetails?.name || 'Unknown Patient',
                            sampleId: fullOrder.sampleId || 'N/A',
                            doctorName: fullOrder.patientDetails?.refDoctor || 'Unknown Doctor',
                            price: fullOrder.tests.reduce((acc, test) => acc + (test.price || 0), 0),
                            createdAt: fullOrder.createdAt || new Date().toISOString(),
                            isRead: false,
                            type: 'new_order',
                            priority: fullOrder.priority || data.priority || 'routine',
                            clinicalAnnotations: fullOrder.clinicalAnnotations || data.clinicalAnnotations || ''
                        };

                        setNotifications(prev => {
                            // Avoid duplicate notifications for the same order
                            if (prev.some(n => n.id === newNotif.id)) return prev;
                            return [newNotif, ...prev].slice(0, 50);
                        });

                        // Only toast if still mounted
                        if (isMounted) {
                            toast.success(`New Lab Order: ${newNotif.patientName}`, {
                                icon: '🔬',
                                className: 'text-xs font-bold'
                            });
                        }

                        // Audio notification
                        try {
                            const isUrgent = ['urgent', 'stat', 'emergency'].includes((newNotif.priority || '').toLowerCase());
                            const audioFile = isUrgent ? '/assets/emergency.mp3' : '/assets/nurse.mp3';
                            const audio = new Audio(audioFile);
                            audio.play().catch(e => console.warn('Audio play failed:', e));
                        } catch (e) {}
                    } catch (err) {
                        console.error('Failed to fetch details for new lab order:', err);
                    }
                };

                // Real-time listener for new lab orders
                await subscribeToSocket('new_lab_order', onNewLabOrder);

                // Store cleanup fn
                unsubscribe = () => unsubscribeFromSocket('new_lab_order', onNewLabOrder);
            } catch (err) {
                console.error('Socket init error in LabNotificationPanel:', err);
            }
        };

        initSocket();

        return () => {
            isMounted = false;
            // Unsubscribe the named callback to prevent duplicate listeners on remount
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl text-indigo-600 transition-all group active:scale-95"
                aria-label="Notifications"
            >
                <Bell size={22} className={unreadCount > 0 ? 'animate-bounce' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] items-center justify-center text-white font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 z-[100] overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Lab Alerts
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase">
                                            {unreadCount} New
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button 
                                        onClick={clearAll}
                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                        title="Clear All"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400"
                                >
                                    <Check size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`p-4 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors relative ${!notif.isRead ? 'bg-indigo-50/10' : ''}`}
                                    >
                                        {!notif.isRead && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                        )}
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 shrink-0">
                                                <FlaskConical size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {notif.patientName}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                                        ₹{notif.price}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                        <Inbox size={12} className="text-gray-400" />
                                                        <span className="truncate">SID: {notif.sampleId}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                        <Stethoscope size={12} className="text-gray-400" />
                                                        <span className="truncate">Dr. {notif.doctorName}</span>
                                                    </div>
                                                </div>

                                                {notif.priority && notif.priority !== 'routine' && (
                                                    <div className="mt-1.5 flex items-center gap-1.5">
                                                        <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-sm uppercase animate-pulse">
                                                            🚨 {notif.priority}
                                                        </span>
                                                    </div>
                                                )}

                                                {notif.clinicalAnnotations && (
                                                    <div className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 p-1.5 rounded mt-1.5 font-semibold border border-amber-200 dark:border-amber-800 line-clamp-2">
                                                        📝 <span className="font-bold">Annotation:</span> {notif.clinicalAnnotations}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mt-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Clock size={10} />
                                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="mx-1">•</span>
                                                    {new Date(notif.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4">
                                        <Inbox size={32} />
                                    </div>
                                    <h4 className="text-gray-900 dark:text-white font-bold italic">No New Alerts</h4>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                        When doctors prescribe new tests, they will appear here in real-time.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {notifications.length > 0 && (
                            <button 
                                onClick={markAllRead}
                                className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-indigo-50 transition-colors border-t border-gray-100 dark:border-gray-800"
                            >
                                Mark All as Read
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(LabNotificationPanel);
