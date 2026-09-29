'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Clock, Inbox, MoreVertical } from 'lucide-react';
import { notificationService, AppNotification } from '@/lib/integrations';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationCenterProps {
  showAuditHistory?: boolean;
  hospitalId?: string;
}

function NotificationCenter({ showAuditHistory = true, hospitalId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    // Join User Room & Listen for real-time notifications
    const initSocket = async () => {
      try {
        const { getSocket, subscribeToSocket } = await import('@/lib/integrations/api/socket');
        const userData = localStorage.getItem('user');
        if (!userData) return;

        const user = JSON.parse(userData);
        const socket = await getSocket();

        const currentUserId = user.id || user._id;
        if (socket && isMounted && currentUserId) {
          console.log('📡 [SOCKET] Initializing for user:', currentUserId);
          socket.emit('join_room', {
            userId: currentUserId,
            role: user.role,
            hospitalId: user.hospital
          });

          // Real-time notifications
          await subscribeToSocket('notification:new', (newNotif: any) => {
            console.log('🔔 [SOCKET] New notification received:', newNotif);
            if (isMounted) {
              const normalizedNotif: AppNotification = {
                ...newNotif,
                _id: typeof newNotif._id === 'object' ? newNotif._id.$oid : newNotif._id,
                isRead: newNotif.isRead ?? false,
                createdAt: newNotif.createdAt || new Date().toISOString()
              };

              setNotifications(prev => {
                // Avoid duplicates
                if (prev.some(n => {
                  const existingId = typeof n._id === 'object' ? (n._id as any).$oid : n._id;
                  return existingId === normalizedNotif._id;
                })) {
                  return prev;
                }
                return [normalizedNotif, ...prev];
              });

              toast.success(normalizedNotif.message || 'New notification', { 
                icon: '🔔', 
                className: 'text-[10px] sm:text-xs' 
              });

              // 🎵 Play notification sound
              try {
                // Check if this is an appointment-related notification
                const isAppointment = normalizedNotif.type?.toLowerCase().includes('appointment') ||
                  normalizedNotif.message?.toLowerCase().includes('appointment');

                if (!isAppointment) {
                  let soundFile = '/assets/nurse.mp3';

                  // Use emergency sound for critical alerts and hospital-wide announcements
                  if (['emergency_alert', 'critical_vitals', 'abnormal_vitals', 'hospital_announcement'].includes(normalizedNotif.type)) {
                    soundFile = '/assets/emergency.mp3';
                  }

                  const audio = new Audio(soundFile);
                  audio.play().catch(e => console.warn('Audio play failed:', e));
                }
              } catch (e) {
                console.error('Audio initialization failed:', e);
              }
            }
          });

          // ✅ NEW: Listen for high-priority doctoral vital alerts globally
          await subscribeToSocket('doctoral_vital_alert', (data: any) => {
            console.log('🚨 [SOCKET] High-priority vital alert:', data);
            if (isMounted) {
              if (data.severity === 'CRITICAL') {
                toast.error(`${data.patientName}: ${data.message}`, {
                  duration: 10000,
                  icon: '🚨',
                  className: 'text-[10px] sm:text-xs',
                  style: { background: '#dc2626', color: '#fff', fontWeight: 'bold' }
                });
              } else {
                toast.error(`${data.patientName}: ${data.message}`, {
                  duration: 6000,
                  icon: '⚠️',
                  className: 'text-[10px] sm:text-xs',
                  style: { background: '#f59e0b', color: '#fff', fontWeight: 'bold' }
                });
              }

              // 🎶 Play emergency notification sound for docs
              try {
                const audio = new Audio('/assets/emergency.mp3');
                audio.play().catch(e => console.warn('Audio play failed:', e));
              } catch (e) {
                console.error('Audio initialization failed:', e);
              }
            }
          });

          // ✅ NEW: Listen for nurse monitoring reminders
          const handleNurseAlert = (data: any) => {
            if (isMounted) {
              toast.success(data.message, {
                duration: 8000,
                icon: '⏰',
                className: 'text-[10px] sm:text-xs',
                style: { background: '#0284c7', color: '#fff', fontWeight: 'bold' }
              });

              try {
                const audio = new Audio('/assets/nurse.mp3');
                audio.play().catch(e => console.warn('Audio play failed:', e));
              } catch (e) {
                console.error('Audio initialization failed:', e);
              }
            }
          };

          await subscribeToSocket('vitals_due_alert', handleNurseAlert);
          await subscribeToSocket('medication_due_alert', handleNurseAlert);
        }
      } catch (err) {
        console.error('Socket init error:', err);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      const cleanup = async () => {
        try {
          const { getSocket } = await import('@/lib/integrations/api/socket');
          const socket = await getSocket();
          if (socket) {
            socket.off('notification:new');
            socket.off('doctoral_vital_alert');
            socket.off('vitals_due_alert');
            socket.off('medication_due_alert');
          }
        } catch (e) {
          console.error(e);
        }
      };
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Initial fetch to show unread count badge
    fetchNotifications();
  }, []); // Run once on mount

  useEffect(() => {
    // Refresh when dropdown opens
    if (isOpen) {
      fetchNotifications();
      // Poll while open
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsActionsOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(hospitalId);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => {
        const notifId = typeof n._id === 'object' ? (n._id as any).$oid : n._id;
        return notifId !== id;
      }));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    try {
      setLoading(true);
      await notificationService.deleteAllNotifications();
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 group"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] items-center justify-center text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-[-60px] sm:right-0 mt-3 w-[280px] xs:w-80 sm:w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-800 z-[999] overflow-hidden transform animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="text-xs sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && <span className="text-[7px] sm:text-[10px] bg-red-100 text-red-600 px-1.5 sm:px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{unreadCount} New</span>}
            </h3>
            <div className="flex items-center gap-1 relative" ref={actionsDropdownRef}>
              {(unreadCount > 0 || notifications.length > 0) && (
                <>
                  <button
                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {isActionsOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-[110] py-1 animate-in fade-in zoom-in-95 duration-200">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            handleMarkAllAsRead();
                            setIsActionsOpen(false);
                          }}
                          disabled={loading}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Check size={12} />
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            handleClearAll();
                            setIsActionsOpen(false);
                          }}
                          disabled={loading}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                          <Trash2 size={12} />
                          Clear All
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {notifications.length > 0 ? (
              <AnimatePresence initial={false}>
                {notifications.map((notif, idx) => {
                  const notifId = typeof notif._id === 'object' ? (notif._id as any).$oid : notif._id;
                  const key = notifId || `notif-${idx}`;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      drag="x"
                      dragConstraints={{ left: -100, right: 100 }}
                      dragElastic={0.05}
                      onDragEnd={(_, info) => {
                        if (Math.abs(info.offset.x) > 80) {
                          handleDelete(notifId, { stopPropagation: () => { } } as any);
                        }
                      }}
                      className="relative overflow-hidden bg-white dark:bg-gray-900"
                    >
                      {/* Delete Background Indicator */}
                      <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-between px-6 pointer-events-none">
                        <Trash2 className="text-rose-600" size={20} />
                        <Trash2 className="text-rose-600" size={20} />
                      </div>

                      <div
                        onClick={() => {
                          if (['discharge_initiated', 'discharge_pending'].includes(notif.type)) {
                            const rel = notif.relatedId;
                            const admissionId = (notif as any).admissionId;

                            if (admissionId) {
                              window.location.href = `/discharge?admissionId=${admissionId}`;
                            } else if (rel) {
                              const relatedIdStr = (rel as any).$oid || (rel as any)?.toString() || String(rel);
                              window.location.href = `/discharge?id=${relatedIdStr}`;
                            }
                          }
                          handleMarkAsRead(notifId);
                        }}
                        className={`p-3 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group relative cursor-pointer transition-colors bg-white dark:bg-gray-900 ${!notif.isRead ? 'bg-blue-50/10 dark:bg-blue-900/10' : ''}`}
                        style={{ position: 'relative', zIndex: 10 }}
                      >
                        <div className="flex gap-2 sm:gap-4">
                          <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${!notif.isRead ? 'bg-blue-600' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[10px] sm:text-sm leading-tight sm:leading-relaxed ${!notif.isRead ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[7px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 sm:w-3 h-3" />
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>•</span>
                              <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {!notif.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notifId);
                                }}
                                className="sm:opacity-0 sm:group-hover:opacity-100 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-blue-600 shadow-sm transition-all"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(notifId, e)}
                              className="sm:opacity-0 sm:group-hover:opacity-100 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-600 shadow-sm transition-all"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {/* Swipe Hint for Mobile */}
                        <div className="sm:hidden mt-2 flex justify-center">
                          <div className="w-4 h-1 rounded-full bg-gray-200 dark:bg-gray-800" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4">
                  <Inbox className="w-8 h-8" />
                </div>
                <h4 className="text-gray-900 dark:text-white font-bold italic">Horizon Clear</h4>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">You've reached notification zero. Enjoy the peaceful view.</p>
              </div>
            )}
          </div>

          {/* Footer removed per user request */}
        </div>
      )}
    </div>
  );
}

export default React.memo(NotificationCenter);
