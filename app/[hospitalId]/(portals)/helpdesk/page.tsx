"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    Users,
    Calendar,
    Stethoscope,
    Activity,
    AlertCircle,
    Plus,
    RefreshCw,
    CheckCircle2,
    LogIn,
    LogOut,
    FileText,
    Globe,
    UserCheck,
    Pencil,
    X,
    CreditCard,
    Wallet,
    Banknote,
    Clock,
    Building2,
    Layers,
    Smartphone
} from "lucide-react";
import { apiClient } from "@/lib/integrations/api/apiClient";
import { generateBlankLetterheadHtml } from "@/lib/print-utils";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import CurechainPagination from "@/components/common/CurechainPagination";
import { toast } from "react-hot-toast";
import {
    useHelpdeskDashboard,
    useHelpdeskDoctors,
    useUpdateAppointmentStatus,
    useCheckIn,
    useCheckOut,
    useTodayStatus,
    useAppointments,
    useHelpdeskProfile
} from "@/lib/integrations/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";
import { AttendanceModal } from "@/components/attendance/AttendanceModal";
import { HelpdeskDashboardSkeleton } from "@/components/ui/skeletons";
import { useAuthStore } from "@/stores/authStore";
import { sanitizePatientName, formatDoctorName, formatPatientDisplayName } from "@/lib/utils/name-utils";

function HelpdeskDashboard() {
    const formatTimeTo12h = (timeStr?: string) => {
        if (!timeStr) return "N/A";
        // Check if already in AM/PM format
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
            return timeStr.toUpperCase();
        }

        try {
            const parts = timeStr.split(':');
            if (parts.length < 2) return timeStr;

            let hours = parseInt(parts[0], 10);
            const minutes = parts[1].substring(0, 2); // Handle cases like "19:59:00" or extra text

            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${hours}:${minutes} ${ampm}`;
        } catch (e) {
            return timeStr;
        }
    };

    const [activeTab, setActiveTab] = useState('active');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'opd' | 'ipd'>('all');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'offline' | 'app'>('all');
    const [startDateFilter, setStartDateFilter] = useState<string>(() => {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    });
    const [endDateFilter, setEndDateFilter] = useState<string>(() => {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    });
    const [historyPage, setHistoryPage] = useState(1);
    const [itemsPerPage] = useState(6);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId || '';

    // Live IST Date & Time (12-hour AM/PM format)
    const [liveDateTime, setLiveDateTime] = useState<{ time: string; date: string }>({
        time: '',
        date: ''
    });

    useEffect(() => {
        const updateISTTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }).toUpperCase();

            const dateStr = now.toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            setLiveDateTime({ time: timeStr, date: dateStr });
        };

        updateISTTime();
        const intervalId = setInterval(updateISTTime, 1000);
        return () => clearInterval(intervalId);
    }, []);

    // Route to Appointment Booking page in edit mode
    const handleOpenEdit = useCallback((apt: any) => {
        const status = (apt.status || '').toLowerCase();
        if (status === 'in-progress' || status === 'completed') {
            toast.error('Cannot edit appointment. Doctor has already started or completed consultation.');
            return;
        }
        const aptId = apt.id || apt._id;
        const hId = hospitalId || apt.hospitalId || apt.hospital || '69a7b003c84f8f6e66180872';
        router.push(`/${hId}/helpdesk/appointment-booking?editId=${aptId}`);
    }, [hospitalId, router]);

    // Check-In with Payment State
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const [checkingInApt, setCheckingInApt] = useState<any | null>(null);
    const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'mixed' | 'unpaid'>('cash');
    const [mixedPayments, setMixedPayments] = useState<{
        cash: string;
        card: string;
        upi: string;
        bankTransfer: string;
    }>({ cash: '', card: '', upi: '', bankTransfer: '' });
    const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

    const handleOpenCheckIn = useCallback((apt: any) => {
        setCheckingInApt(apt);
        const isPrePaid = apt.isMobile || apt.bookingChannel === 'app' || apt.source === 'app' || apt.paymentStatus?.toLowerCase() === 'paid';
        setPaymentMode(isPrePaid ? 'upi' : 'cash');
        const defaultFee = apt.fee || apt.consultationFee || apt.amount || 300;
        setMixedPayments({ cash: isPrePaid ? '' : String(defaultFee), card: '', upi: isPrePaid ? String(defaultFee) : '', bankTransfer: '' });
        setIsCheckInModalOpen(true);
    }, []);

    const updateMixedPayment = (field: 'cash' | 'card' | 'upi' | 'bankTransfer', rawValue: string) => {
        // Strip out any minus signs or negative indicators, allow only numbers and decimal point
        const cleaned = rawValue.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
        setMixedPayments(prev => ({ ...prev, [field]: sanitized }));
    };

    const handleConfirmCheckIn = async () => {
        if (!checkingInApt) return;
        const aptId = checkingInApt.id || checkingInApt._id;
        const totalFee = Number(checkingInApt.fee || (checkingInApt as any).consultationFee || checkingInApt.amount || 300);

        let parsedPaymentDetails: any = undefined;
        let amountPaid = totalFee;

        if (paymentMode === 'mixed') {
            const c = Math.max(0, Number(mixedPayments.cash || 0));
            const crd = Math.max(0, Number(mixedPayments.card || 0));
            const u = Math.max(0, Number(mixedPayments.upi || 0));
            const bt = Math.max(0, Number(mixedPayments.bankTransfer || 0));
            const sum = c + crd + u + bt;
            if (sum <= 0) {
                toast.error('Please enter amount for at least one payment method');
                return;
            }
            parsedPaymentDetails = { cash: c, card: crd, upi: u, bankTransfer: bt };
            amountPaid = sum;
        } else if (paymentMode === 'unpaid') {
            amountPaid = 0;
        } else {
            parsedPaymentDetails = {
                cash: paymentMode === 'cash' ? totalFee : 0,
                upi: paymentMode === 'upi' ? totalFee : 0,
                card: paymentMode === 'card' ? totalFee : 0,
                bankTransfer: paymentMode === 'bank_transfer' ? totalFee : 0,
            };
        }

        setIsSubmittingCheckIn(true);
        try {
            const res = await apiClient<any>(`/helpdesk/appointments/${aptId}/check-in`, {
                method: 'POST',
                body: JSON.stringify({
                    paymentMode,
                    paymentStatus: paymentMode === 'unpaid' ? 'pending' : 'paid',
                    amountPaid,
                    paymentDetails: parsedPaymentDetails,
                }),
            });
            if (res && res.success !== false) {
                toast.success('Patient checked in! Dispatched to Doctor Queue.');
                setIsCheckInModalOpen(false);
                setCheckingInApt(null);
                refetchDashboard();
            } else {
                toast.error(res?.message || 'Check-in failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'Check-in error');
        } finally {
            setIsSubmittingCheckIn(false);
        }
    };

    // ✅ Smart Date Handlers: Prevent Start > End or End < Start gracefully
    const handleStartDateChange = (val: string) => {
        setStartDateFilter(val);
        if (endDateFilter && val > endDateFilter) {
            setEndDateFilter(val);
        }
    };

    const handleEndDateChange = (val: string) => {
        setEndDateFilter(val);
        if (startDateFilter && val < startDateFilter) {
            setStartDateFilter(val);
        }
    };

    const todayStr = useMemo(() => {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    }, []);

    // ✅ React Query hooks for real-time updates (backend handles caching with Redis)
    const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, isPlaceholderData: isDashboardPlaceholder } = useHelpdeskDashboard();

    // ✅ Fetch full appointments for the selected date range (this includes History/Completed)
    const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments(
        1,
        500, // Large limit to handle filtering in memory for now, or we can paginate properly
        undefined,
        startDateFilter,
        endDateFilter
    );

    const queryClient = useQueryClient();

    // ── Real-Time Socket Synchronization for Frontdesk Dashboard ───────────────
    useEffect(() => {
        let socketInstance: any = null;
        let isCleanedUp = false;

        const refreshAll = () => {
            refetchDashboard();
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['helpdesk-dashboard'] });
        };

        const setupSocket = async () => {
            socketInstance = await getSocket();
            if (!socketInstance || isCleanedUp) return;

            if (hospitalId) {
                joinSocketRoom({
                    role: user?.role || 'helpdesk',
                    userId: user?.id || (hospitalId as string),
                    hospitalId: hospitalId as string,
                });
                socketInstance.emit('join_hospital', hospitalId);
            }

            socketInstance.on('queue_update', refreshAll);
            socketInstance.on('consultation_started', refreshAll);
            socketInstance.on('consultation_paused', refreshAll);
            socketInstance.on('consultation_resumed', refreshAll);
            socketInstance.on('appointment_status_changed', refreshAll);
            socketInstance.on('appointment:status_change', refreshAll);
            socketInstance.on('dashboard:update', refreshAll);
        };

        setupSocket();

        // 5s background polling guarantees status updates even if websocket is disconnected
        const pollTimer = setInterval(refreshAll, 5000);

        return () => {
            isCleanedUp = true;
            clearInterval(pollTimer);
            if (socketInstance) {
                socketInstance.off('queue_update', refreshAll);
                socketInstance.off('consultation_started', refreshAll);
                socketInstance.off('consultation_paused', refreshAll);
                socketInstance.off('consultation_resumed', refreshAll);
                socketInstance.off('appointment_status_changed', refreshAll);
                socketInstance.off('appointment:status_change', refreshAll);
                socketInstance.off('dashboard:update', refreshAll);
            }
        };
    }, [hospitalId, refetchDashboard, queryClient]);

    const { data: doctorsData, isLoading: doctorsLoading, isPlaceholderData: isDoctorsPlaceholder } = useHelpdeskDoctors();
    const updateStatusMutation = useUpdateAppointmentStatus();

    // ✅ Attendance Hooks for Shift Management
    const { data: attendanceResponse, isLoading: attendanceLoading, refetch: refetchAttendance } = useTodayStatus();
    const todayAttendance = attendanceResponse?.attendance;
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();
    const { data: helpdeskProfile } = useHelpdeskProfile();

    const handleCheckIn = useCallback(async (payload?: any) => {
        try {
            await checkInMutation.mutateAsync(payload);
            toast.success("Clocked in successfully!");
            setIsAttendanceModalOpen(false);
        } catch (err: any) {
            toast.error(err.message || "Clock-in failed");
        }
    }, [checkInMutation]);

    const triggerCheckIn = useCallback(() => {
        setIsAttendanceModalOpen(true);
    }, []);

    const handleCheckOut = useCallback(async () => {
        try {
            await checkOutMutation.mutateAsync(undefined);
            toast.success("Clocked out successfully!");
        } catch (err: any) {
            toast.error(err.message || "Clock-out failed");
        }
    }, [checkOutMutation]);

    // ✅ Memoized computed values to prevent unnecessary recalculations
    const allDoctors = useMemo(() => {
        if (!doctorsData) return [];
        // Filter out invalid/placeholder doctor records
        return doctorsData.filter((doc: any) => {
            const name = doc.user?.name || doc.name;
            return name &&
                name.toLowerCase() !== 'unknown' &&
                name.toLowerCase() !== 'unknown doctor' &&
                name.toLowerCase() !== 'unknown physician';
        });
    }, [doctorsData]);

    const appointments = useMemo(() => {
        // 1. Resolve the source list (handle various API response structures)
        let list: any[] = [];
        if (Array.isArray(appointmentsData)) {
            list = appointmentsData;
        } else if (appointmentsData?.appointments && Array.isArray(appointmentsData.appointments)) {
            list = appointmentsData.appointments;
        } else if (appointmentsData?.data && Array.isArray(appointmentsData.data)) {
            list = appointmentsData.data;
        } else if (dashboardData?.appointments) {
            list = dashboardData.appointments;
        }

        // 2. SAFETY FALLBACK: Mandatory Date Filtering
        // Even if appointmentsData is used, we filter manually to ensure the UI stays consistent 
        // especially if the backend doesn't support the date params we added yet.
        if (startDateFilter || endDateFilter) {
            list = list.filter((apt: any) => {
                const aptDateStr = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
                if (!aptDateStr) return false;

                let isValid = true;
                if (startDateFilter && aptDateStr < startDateFilter) isValid = false;
                if (endDateFilter && aptDateStr > endDateFilter) isValid = false;
                return isValid;
            });
        }

        // 3. Filter by Doctor if selected
        if (selectedDoctorId) {
            list = list.filter((apt: any) => {
                const docId = selectedDoctorId.toString().toLowerCase();
                return (
                    (apt.doctorId?.toString().toLowerCase() === docId) ||
                    (apt.doctor?._id?.toString().toLowerCase() === docId) ||
                    (apt.doctorName?.toString().toLowerCase() === docId) ||
                    (apt.doctorName === selectedDoctorId)
                );
            });
        }

        // 4. Filter by Visit Type (OPD/IPD/ALL)
        if (visitTypeFilter !== 'all') {
            list = list.filter((apt: any) => {
                const type = apt.type?.toLowerCase() || 'opd';
                if (visitTypeFilter === 'opd') {
                    return type === 'opd' || type === 'consultation' || type === 'online';
                }
                return type === visitTypeFilter.toLowerCase();
            });
        }

        // 5. Filter by Source Channel (All / Online Web / App / Offline Walk-in)
        if (sourceFilter === 'online') {
            list = list.filter((apt: any) => 
                (apt.type?.toLowerCase() === 'online' || apt.bookingChannel === 'website' || apt.bookingChannel === 'online' || apt.source === 'online' || apt.source === 'website') && 
                !apt.isMobile && 
                apt.source !== 'app' && 
                apt.bookingChannel !== 'app'
            );
        } else if (sourceFilter === 'app') {
            list = list.filter((apt: any) => 
                apt.isMobile === true || 
                apt.source === 'app' || 
                apt.bookingChannel === 'app' || 
                apt.appointmentType?.toLowerCase() === 'mobile' ||
                (apt.paymentMethod === 'razorpay' && !apt.visitType)
            );
        } else if (sourceFilter === 'offline') {
            list = list.filter((apt: any) => 
                apt.type?.toLowerCase() !== 'online' && 
                !apt.isMobile && 
                apt.source !== 'app' && 
                apt.bookingChannel !== 'app'
            );
        }

        return list;
    }, [dashboardData, appointmentsData, selectedDoctorId, startDateFilter, endDateFilter, visitTypeFilter, sourceFilter]);

    // Live counts for source switcher
    const sourceCounts = useMemo(() => {
        let list: any[] = [];
        if (Array.isArray(appointmentsData)) list = appointmentsData;
        else if (appointmentsData?.appointments && Array.isArray(appointmentsData.appointments)) list = appointmentsData.appointments;
        else if (appointmentsData?.data && Array.isArray(appointmentsData.data)) list = appointmentsData.data;
        else if (dashboardData?.appointments) list = dashboardData.appointments;

        if (startDateFilter || endDateFilter) {
            list = list.filter((apt: any) => {
                const aptDateStr = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
                if (!aptDateStr) return false;
                let isValid = true;
                if (startDateFilter && aptDateStr < startDateFilter) isValid = false;
                if (endDateFilter && aptDateStr > endDateFilter) isValid = false;
                return isValid;
            });
        }

        const app = list.filter((a: any) => 
            a.isMobile === true || 
            a.source === 'app' || 
            a.bookingChannel === 'app' ||
            a.appointmentType?.toLowerCase() === 'mobile' ||
            (a.paymentMethod === 'razorpay' && !a.visitType)
        ).length;

        const online = list.filter((a: any) => 
            (a.type?.toLowerCase() === 'online' || a.bookingChannel === 'website' || a.bookingChannel === 'online' || a.source === 'online' || a.source === 'website') && 
            !a.isMobile && 
            a.source !== 'app' && 
            a.bookingChannel !== 'app'
        ).length;

        const total = list.length;
        const offline = Math.max(0, total - online - app);

        return {
            all: total,
            online,
            app,
            offline
        };
    }, [appointmentsData, dashboardData, startDateFilter, endDateFilter]);

    const historyAppointments = useMemo(() => {
        return appointments.filter(a => ['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase()));
    }, [appointments]);

    const activeAppointments = useMemo(() => {
        const active = appointments.filter(a => !['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase()));
        
        // Sort active queue by appointmentTime or createdAt ascending (FIFO)
        return active.sort((a, b) => {
            // First try sorting by appointment time if it exists and date is the same
            const dateA = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
            const dateB = b.date ? new Date(b.date).toISOString().split('T')[0] : '';
            
            if (dateA === dateB && a.appointmentTime && b.appointmentTime) {
                // Time comparison logic (converting 12h to 24h for comparison)
                const parseTime = (timeStr: string) => {
                    if (!timeStr) return 0;
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                    if (!match) return 0;
                    let [, h, m, ampm] = match;
                    let hours = parseInt(h, 10);
                    if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + parseInt(m, 10);
                };
                
                const timeA = parseTime(a.appointmentTime);
                const timeB = parseTime(b.appointmentTime);
                if (timeA !== timeB) return timeA - timeB;
            }
            
            // Fallback to createdAt or date ascending
            const tA = new Date(a.createdAt || a.date || 0).getTime();
            const tB = new Date(b.createdAt || b.date || 0).getTime();
            return tA - tB;
        });
    }, [appointments]);

    const paginatedHistory = useMemo(() => {
        const start = (historyPage - 1) * itemsPerPage;
        return historyAppointments.slice(start, start + itemsPerPage);
    }, [historyAppointments, historyPage]);

    const doctorQueues = useMemo(() => {
        const counts: Record<string, { count: number, id: string, specialty?: string }> = {};

        allDoctors.forEach((doc: any) => {
            const name = doc.user?.name || doc.name || "Unknown Doctor";
            counts[name] = {
                count: 0,
                id: doc._id,
                specialty: doc.specialties?.[0] || doc.department
            };
        });

        let sourceAppointments: any[] = [];
        if (Array.isArray(appointmentsData)) {
            sourceAppointments = appointmentsData;
        } else if (appointmentsData?.appointments && Array.isArray(appointmentsData.appointments)) {
            sourceAppointments = appointmentsData.appointments;
        } else if (appointmentsData?.data && Array.isArray(appointmentsData.data)) {
            sourceAppointments = appointmentsData.data;
        } else if (dashboardData?.appointments) {
            sourceAppointments = dashboardData.appointments;
        }

        // Filter by Date Range (redundant if using appointmentsData, but kept for fallback)
        if (startDateFilter || endDateFilter) {
            sourceAppointments = sourceAppointments.filter((apt: any) => {
                const aptDateStr = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
                if (!aptDateStr) return false;
                let isValid = true;
                if (startDateFilter && aptDateStr < startDateFilter) isValid = false;
                if (endDateFilter && aptDateStr > endDateFilter) isValid = false;
                return isValid;
            });
        }

        // Filter by Visit Type (OPD/IPD/ALL)
        if (visitTypeFilter !== 'all') {
            sourceAppointments = sourceAppointments.filter((apt: any) => {
                const type = apt.type?.toLowerCase() || 'opd';
                if (visitTypeFilter === 'opd') {
                    return type === 'opd' || type === 'consultation';
                }
                return type === visitTypeFilter.toLowerCase();
            });
        }

        sourceAppointments.forEach((apt: any) => {
            const status = apt.status?.toLowerCase();
            if (['booked', 'pending', 'confirmed', 'in-progress'].includes(status)) {
                const docName = apt.doctorName;
                const docId = apt.doctorId || (typeof apt.doctor === 'object' ? apt.doctor?._id : apt.doctor);

                if (docName && docName.toLowerCase() !== 'unknown doctor' && docName.toLowerCase() !== 'unknown physician') {
                    let matched = false;

                    // Try matching by ID first (most accurate)
                    if (docId) {
                        const entryById = Object.entries(counts).find(([_, data]) => String(data.id) === String(docId));
                        if (entryById) {
                            entryById[1].count++;
                            matched = true;
                        }
                    }

                    // Fallback to name match (case-insensitive, space-insensitive, and prefix-agnostic)
                    if (!matched) {
                        const normalizeName = (n: string) => {
                            let cleaned = n.trim().toLowerCase();
                            while (/^(dr|dr\.|dr\s+|dr\.\s+)/i.test(cleaned)) {
                                cleaned = cleaned.replace(/^(dr|dr\.|dr\s+|dr\.\s+)/i, "").trim();
                            }
                            return cleaned.replace(/\s+/g, "");
                        };
                        const normDocName = normalizeName(docName);
                        const entryByName = Object.entries(counts).find(([name, _]) => normalizeName(name) === normDocName);
                        if (entryByName) {
                            entryByName[1].count++;
                        }
                    }
                }
            }
        });

        return Object.entries(counts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);
    }, [allDoctors, dashboardData, appointmentsData, startDateFilter, endDateFilter, visitTypeFilter]);

    // ✅ Search/Sort & Calculate Wait Times
    const waitTimes = useMemo(() => {
        const map: Record<string, string> = {};
        const queues: Record<string, any[]> = {};

        // Create a map of doctor durations for quick lookup
        const doctorDurationMap: Record<string, number> = {};
        if (allDoctors) {
            allDoctors.forEach((doc: any) => {
                // Map both by _id and user._id/user.id/name to be safe
                if (doc._id) doctorDurationMap[doc._id] = doc.consultationDuration || 0;
                if (doc.user?._id) doctorDurationMap[doc.user._id] = doc.consultationDuration || 0;
                if (doc.user?.name) doctorDurationMap[doc.user.name] = doc.consultationDuration || 0;
            });
        }

        // 1. Group active appointments by doctor
        appointments.forEach((apt: any) => {
            // Filter for active statuses (Waiting queue)
            if (['booked', 'pending', 'confirmed', 'scheduled', 'in-progress'].includes(apt.status?.toLowerCase())) {
                // Use doctor ID if available, otherwise fallback to name
                const docId = apt.doctor?._id || apt.doctorId || apt.doctorName;
                if (!docId) return;

                if (!queues[docId]) queues[docId] = [];
                queues[docId].push(apt);
            }
        });

        // 2. Sort queues and assign times
        Object.entries(queues).forEach(([docKey, queue]) => {
            // Sort: Earliest Created -> First in Queue
            queue.sort((a, b) => {
                const tA = new Date(a.createdAt || a.date || 0).getTime();
                const tB = new Date(b.createdAt || b.date || 0).getTime();
                return tA - tB;
            });

            // Get duration for this doctor (default to 0 if not found)
            // docKey could be ID or Name
            const duration = doctorDurationMap[docKey] || 0;

            // Assign time: Index * duration
            queue.forEach((apt, idx) => {
                const totalMins = idx * duration;
                const h = Math.floor(totalMins / 60);
                const m = totalMins % 60;
                map[apt._id || apt.id] = h > 0 ? `${h}h ${m}m` : `${m}m`;
            });
        });

        return map;
    }, [appointments, allDoctors]);

    // ✅ Calculated stats based on current view/filter
    const stats = useMemo(() => {
        // Determine the dynamic label based on the date filter range
        // todayStr is defined at component level

        let label = "Today's";
        if (startDateFilter !== todayStr || endDateFilter !== todayStr) {
            if (startDateFilter === endDateFilter && startDateFilter) {
                label = startDateFilter.split('-').reverse().join('-');
            } else if (startDateFilter && endDateFilter) {
                label = `${startDateFilter.split('-').reverse().join('-')} TO ${endDateFilter.split('-').reverse().join('-')}`;
            } else {
                label = "All Dates";
            }
        }

        // Use appointments which is already date & doctor filtered
        const filteredAppointments = appointments;

        // Define active and completed statuses
        const activeStatStatuses = ['booked', 'pending', 'confirmed', 'in-progress', 'scheduled', 'waiting'];
        const completedStatStatuses = ['completed'];

        // Helper to filter by visit type
        const filterByType = (apt: any) => {
            if (visitTypeFilter === 'all') return true;
            const type = apt.type?.toLowerCase() || 'opd';
            if (visitTypeFilter === 'opd') {
                return type === 'opd' || type === 'consultation';
            }
            return type === visitTypeFilter.toLowerCase();
        };

        const targetApts = filteredAppointments.filter(apt => {
            const status = apt.status?.toLowerCase();
            return (activeStatStatuses.includes(status) || completedStatStatuses.includes(status)) && filterByType(apt);
        });

        const completedApts = filteredAppointments.filter(apt => {
            const status = apt.status?.toLowerCase();
            return completedStatStatuses.includes(status) && filterByType(apt);
        });

        return {
            dynamicLabel: label,
            totalPatients: dashboardData?.stats?.totalPatients ?? 0,
            todayPatients: targetApts.length,
            emergencyCases: filteredAppointments.filter(a => a.type?.toLowerCase() === 'emergency').length,
            completedToday: completedApts.length,
            hospitalName: (dashboardData?.stats as any)?.hospitalName ?? 'Hospital Main',
        };
    }, [appointments, dashboardData, visitTypeFilter, startDateFilter, endDateFilter]);

    // ✅ Optimized handler with useCallback to prevent re-renders
    const handleRefresh = useCallback(() => {
        refetchDashboard();
    }, [refetchDashboard]);

    // ✅ Socket Integration for real-time updates
    const { user } = useAuthStore?.() || {};

    React.useEffect(() => {
        let mounted = true;

        const setupSocket = async () => {
            if (user?.id) {
                const socketLib = await import("@/lib/integrations/api/socket");
                const { subscribeToSocket, unsubscribeFromSocket, joinSocketRoom } =
                    socketLib;

                await joinSocketRoom({
                    role: user.role,
                    userId: user.id,
                    hospitalId: user.hospitalId || (user as any).hospital,
                });

                const handleUpdate = (data: any) => {
                    console.log("🔔 Helpdesk Dashboard Update Received:", data);
                    if (mounted) refetchDashboard();
                };

                // Subscribe to helpdesk and hospital events
                await subscribeToSocket("dashboard:update", handleUpdate);
                await subscribeToSocket("appointment_request", handleUpdate);
                await subscribeToSocket("appointment:updated", handleUpdate);

                return () => {
                    unsubscribeFromSocket("dashboard:update", handleUpdate);
                    unsubscribeFromSocket("appointment_request", handleUpdate);
                    unsubscribeFromSocket("appointment:updated", handleUpdate);
                };
            }
        };

        setupSocket();

        return () => {
            mounted = false;
        };
    }, [user, refetchDashboard]);

    const handleUpdateStatus = useCallback(async (appointmentId: string, status: string) => {
        try {
            await updateStatusMutation.mutateAsync({ appointmentId, status });
            toast.success("Appointment sent to doctor");
        } catch (err: any) {
            toast.error("Update Failed");
        }
    }, [updateStatusMutation]);
    
    const handlePrintLetterhead = useCallback(() => {
        if (!helpdeskProfile?.hospital) {
            toast.error("Hospital data not loaded yet");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (printWindow) {
            const html = generateBlankLetterheadHtml({
                hospital: helpdeskProfile.hospital
            });
            printWindow.document.write(html);
            printWindow.document.close();
        }
    }, [helpdeskProfile]);

    // ✅ Only show skeleton on true initial load (not on cached data)
    const showSkeleton = (dashboardLoading && !dashboardData) || (doctorsLoading && !doctorsData);

    if (showSkeleton) {
        return <HelpdeskDashboardSkeleton />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-150">

            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 max-w-full mx-auto overflow-hidden">
                <div className="shrink-0">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Front Desk Dashboard
                    </h1>
                    <p className="text-[7px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1 truncate">CureChain Health / Front Desk Portal</p>
                </div>

                {/* GLOWING MESSAGE - HEADER CENTER (only show on large screens to keep header in one line) */}
                <div className="hidden lg:flex items-center justify-center flex-1 mx-4">
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest text-center" style={{ animation: 'glow 2s ease-in-out infinite' }}>
                        ✨ Your data is storing continuously
                    </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                    {/* ATTENDANCE CONTROLS */}
                    <div className="flex items-center gap-0.5 sm:gap-2 mr-0.5 sm:mr-2 bg-slate-50 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-inner">

                        {!todayAttendance?.checkIn ? (
                            <button
                                onClick={triggerCheckIn}
                                disabled={checkInMutation.isPending || attendanceLoading}
                                className="flex items-center gap-0.5 px-1.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-emerald-500/20"
                            >
                                {checkInMutation.isPending ? (
                                    <RefreshCw size={10} className="animate-spin" />
                                ) : (
                                    <LogIn size={10} strokeWidth={3} />
                                )}
                                <span className="inline">Clock In</span>
                            </button>
                        ) : !todayAttendance?.checkOut ? (
                            <div className="flex items-center gap-0.5 sm:gap-2">
                                <div className="px-1.5 sm:px-3 py-1 sm:py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-1">
                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest tabular-nums">
                                        {todayAttendance?.checkIn?.time ? new Date(todayAttendance.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCheckOut}
                                    disabled={checkOutMutation.isPending || attendanceLoading}
                                    className="flex items-center gap-0.5 px-1.5 sm:px-4 py-1.5 sm:py-2 bg-rose-600 text-white rounded-lg text-[6.5px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-rose-500/20"
                                >
                                    {checkOutMutation.isPending ? (
                                        <RefreshCw size={10} className="animate-spin" />
                                    ) : (
                                        <LogOut size={10} strokeWidth={3} />
                                    )}
                                    <span className="inline">Clock Out</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-0.5 px-1.5 py-1.5 sm:px-4 sm:py-2 bg-slate-200 text-slate-500 rounded-lg text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest border border-slate-300/50">
                                <CheckCircle2 size={10} strokeWidth={3} />
                                <span className="inline">Shift Ended</span>
                            </div>
                        )}

                    </div>

                    {/* Global Search/Filter Indicator */}
                    {selectedDoctorId && (
                        <button
                            onClick={() => setSelectedDoctorId(null)}
                            className="px-1.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-bold uppercase tracking-wider border border-rose-100 animate-pulse hover:bg-rose-100"
                        >
                            Reset
                        </button>
                    )}
                    
                    {/* Live IST Time & Date Indicator with Small Animation */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-2 bg-white border border-slate-200/90 rounded-lg sm:rounded-xl shadow-xs group hover:border-teal-400 transition-all">
                        <div className="relative flex items-center justify-center shrink-0">
                            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 transition-transform group-hover:scale-105">
                                <Clock size={11} className="sm:size-[14px] text-teal-600 animate-pulse" />
                            </div>
                            <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div className="flex flex-col justify-center leading-none">
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] sm:text-[11px] font-black text-slate-800 tracking-tight tabular-nums">
                                    {liveDateTime.time || '--:--:-- --'}
                                </span>
                                <span className="text-[6px] sm:text-[7.5px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200/60">
                                    IST
                                </span>
                            </div>
                            <span className="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                {liveDateTime.date || '------'}
                            </span>
                        </div>
                    </div>
                    <Link
                        href="/helpdesk/patient-registration"
                        className="flex items-center gap-0.5 sm:gap-2 px-2 sm:px-5 py-1.5 sm:py-2.5 bg-teal-600 text-white rounded-lg sm:rounded-xl text-[7.5px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 shadow-lg shadow-teal-900/20"
                    >
                        <Plus size={10} className="sm:size-[16px]" /> 
                        <span className="hidden md:inline">Register Patient</span>
                        <span className="md:hidden">Register</span>
                    </Link>
                </div>
            </div>

            <AttendanceModal 
                isOpen={isAttendanceModalOpen} 
                onClose={() => setIsAttendanceModalOpen(false)} 
                onConfirm={handleCheckIn} 
            />

            {/* STATS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 max-w-full mx-auto">
                <StatCard
                    icon={<Users size={14} className="sm:size-[16px]" />}
                    title="Total Patients"
                    value={stats.totalPatients || 0}
                    trend="In Registry"
                    color="slate"
                />
                <StatCard
                    icon={<Calendar size={14} className="sm:size-[16px]" />}
                    title={stats.dynamicLabel}
                    value={stats.todayPatients || 0}
                    trend="Live Now"
                    color="teal"
                    typeFilter={visitTypeFilter}
                    onTypeChange={setVisitTypeFilter}
                />
                <StatCard
                    icon={<AlertCircle size={14} className="sm:size-[16px]" />}
                    title="Emergency"
                    value={stats.emergencyCases || 0}
                    trend="Critical"
                    color="rose"
                />
                <StatCard
                    icon={<CheckCircle2 size={14} className="sm:size-[16px]" />}
                    title={startDateFilter === todayStr && endDateFilter === todayStr ? "Completed" : `Completed ${stats.dynamicLabel}`}
                    value={stats.completedToday || 0}
                    trend="Discharged"
                    color="emerald"
                    typeFilter={visitTypeFilter}
                    onTypeChange={setVisitTypeFilter}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-4 items-start max-w-full mx-auto">

                {/* DOCTOR QUEUES (LEFT SIDE) */}
                <div className="md:col-span-1 lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Doctors</h2>
                            {/* Specialized "All" Button at header level */}
                            <button
                                onClick={() => setSelectedDoctorId(null)}
                                className={`flex items-center justify-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border ${!selectedDoctorId
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                                    : 'bg-white text-slate-400 border-slate-200 hover:text-teal-600 hover:border-teal-200'
                                    }`}
                                title="Clear Doctor Filter"
                            >
                                All
                            </button>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-teal-100">
                            Live Tracker
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                        {doctorQueues.length > 0 ? doctorQueues.map((doc, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedDoctorId(selectedDoctorId === (doc.id || doc.name) ? null : (doc.id || doc.name))}
                                className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer ${selectedDoctorId === (doc.id || doc.name)
                                    ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500/20 shadow-md'
                                    : 'bg-white border-slate-200 shadow-sm hover:border-teal-400'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${selectedDoctorId === (doc.id || doc.name) ? 'bg-teal-600 text-white' :
                                        doc.count > 0 ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-300'
                                        }`}>
                                        <Stethoscope size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 uppercase max-w-[300px]">{doc.name}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                            {doc.specialty || "General Medicine"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                    <div className={`text-2xl font-bold tabular-nums ${doc.count > 3 ? 'text-rose-600' : doc.count > 0 ? 'text-teal-600' : 'text-slate-200'
                                        }`}>
                                        {doc.count}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting</span>
                                </div>
                            </button>
                        )) : (
                            <div className="bg-slate-50/50 p-12 rounded-[32px] border border-dashed border-slate-200 text-center">
                                <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">No Doctors Available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* APPOINTMENT LIST (RIGHT SIDE) */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[425px]">

                        {/* TABS & SEARCH */}
                        <div className="p-2.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <button
                                        onClick={() => setActiveTab('active')}
                                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'active' ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Waiting
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'history' ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        History
                                    </button>
                                </div>

                                {/* Online (Web) vs App vs Offline (Desk) Source Switcher */}
                                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setSourceFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${sourceFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        All ({sourceCounts.all})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSourceFilter('online')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${sourceFilter === 'online' ? 'bg-cyan-600 text-white shadow-sm' : 'text-cyan-700 bg-cyan-50/70 hover:bg-cyan-100/70'}`}
                                        title="View appointments booked via Hospital Website"
                                    >
                                        <Globe size={11} className={sourceFilter === 'online' ? 'animate-spin' : ''} />
                                        Website ({sourceCounts.online})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSourceFilter('app')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${sourceFilter === 'app' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70'}`}
                                        title="View appointments booked via Mobile Patient App"
                                    >
                                        <Smartphone size={11} />
                                        App ({sourceCounts.app})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSourceFilter('offline')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${sourceFilter === 'offline' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        title="View counter walk-in appointments"
                                    >
                                        Offline ({sourceCounts.offline})
                                    </button>
                                </div>

                                {/* Date Filter */}
                                <div className="flex items-center bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-teal-500/50 transition-all flex-wrap gap-y-2 gap-x-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-[130px] sm:min-w-0">
                                        <Calendar size={14} className="text-teal-600 hidden sm:block" />
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">From</span>
                                        <input
                                            type="date"
                                            value={startDateFilter || ''}
                                            onChange={(e) => handleStartDateChange(e.target.value)}
                                            className="flex-1 bg-transparent text-[10px] sm:text-[11px] font-black text-slate-700 outline-none uppercase tracking-widest cursor-pointer select-none"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                    <div className="w-[1px] h-4 bg-slate-200 hidden sm:block"></div>
                                    <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-[130px] sm:min-w-0 border-l sm:border-0 border-slate-100 pl-2 sm:pl-0">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">To</span>
                                        <input
                                            type="date"
                                            value={endDateFilter || ''}
                                            onChange={(e) => handleEndDateChange(e.target.value)}
                                            className="flex-1 bg-transparent text-[10px] sm:text-[11px] font-black text-slate-700 outline-none uppercase tracking-widest cursor-pointer select-none"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1 ml-auto w-full sm:w-auto justify-end sm:justify-start">
                                        {(() => {
                                            const today = new Date();
                                            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                                            const todayStr = today.toISOString().split('T')[0];
                                            return (startDateFilter !== todayStr || endDateFilter !== todayStr);
                                        })() && (
                                                <button
                                                    onClick={() => {
                                                        const today = new Date();
                                                        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                                                        const todayStr = today.toISOString().split('T')[0];
                                                        setStartDateFilter(todayStr);
                                                        setEndDateFilter(todayStr);
                                                    }}
                                                    className="text-[9px] text-teal-600 font-black uppercase bg-teal-50 px-2 py-0.5 rounded-md hover:bg-teal-100 transition-colors"
                                                >
                                                    Today
                                                </button>
                                            )}
                                        {(startDateFilter || endDateFilter) ? (
                                            <button
                                                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                                                className="text-[9px] text-rose-500 font-black uppercase bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition-colors"
                                            >
                                                Clear
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            {activeTab === 'history' && (
                                <div className="shrink-0 flex items-center">
                                    <CurechainPagination
                                        currentPage={historyPage}
                                        totalItems={historyAppointments.length}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setHistoryPage}
                                    />
                                </div>
                            )}
                        </div>

                        {/* LIST CONTENT */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 min-h-0">
                            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 sticky top-0 bg-white z-10">
                                <div className="col-span-1 border-r border-slate-100">#</div>
                                <div className="col-span-3">Patient Details</div>
                                <div className="col-span-2 text-center whitespace-nowrap">Date & Time</div>
                                <div className="col-span-1 text-center">Type</div>
                                <div className="col-span-2">Assigned Doctor</div>
                                <div className="col-span-3 text-right pr-2">Status</div>
                            </div>

                            {(activeTab === 'active' ? activeAppointments : paginatedHistory).length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {(activeTab === 'active' ? activeAppointments : paginatedHistory)
                                        .map((apt, idx) => (
                                            <div key={idx} className="group relative">
                                                {/* Desktop View (Table Layout) */}
                                                <div className="hidden sm:grid grid-cols-12 items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 rounded-xl transition-all">
                                                    <div className="col-span-1 border-r border-slate-100 flex flex-col justify-center">
                                                        <span className="text-xs font-black text-slate-800">
                                                            #{(apt as any).token_number ? String((apt as any).token_number).padStart(2, '0') : (activeTab === 'active' ? (idx + 1).toString().padStart(2, '0') : ((historyPage - 1) * itemsPerPage + idx + 1).toString().padStart(2, '0'))}
                                                        </span>
                                                        {(apt as any).token_number && (
                                                            <span className="text-[7.5px] font-bold text-teal-600 uppercase tracking-tighter">Token</span>
                                                        )}
                                                    </div>

                                                    <div className="col-span-3 flex items-center gap-4 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white'
                                                            }`}>
                                                            {formatPatientDisplayName(apt.patient, apt, true).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">
                                                                {formatPatientDisplayName(apt.patient, apt, true)}
                                                            </h4>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                MRN: {(apt as any).mrn || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                                                        <span className="text-[9px] font-black uppercase tracking-tight text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                                                            {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "N/A"}
                                                        </span>
                                                        <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">
                                                            {formatTimeTo12h(apt.appointmentTime || apt.startTime || apt.time)}
                                                        </span>
                                                    </div>

                                                    <div className="col-span-1 flex justify-center">
                                                        {(apt as any).isMobile || (apt as any).bookingChannel === 'app' || (apt as any).source === 'app' ? (
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                                                                <Smartphone size={9} className="text-indigo-600 shrink-0" />
                                                                App
                                                            </span>
                                                        ) : (apt as any).type?.toLowerCase() === 'online' ? (
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
                                                                <Globe size={9} className="text-cyan-600 shrink-0" />
                                                                Website
                                                            </span>
                                                        ) : (apt as any).type === 'EMERGENCY' ? (
                                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block bg-rose-50 text-rose-600 border border-rose-100">
                                                                Emergency
                                                            </span>
                                                        ) : (apt as any).type === 'IPD' ? (
                                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block bg-purple-50 text-purple-600 border border-purple-100">
                                                                IPD
                                                            </span>
                                                        ) : (
                                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block bg-slate-100 text-slate-600 border border-slate-200">
                                                                Offline
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="col-span-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Stethoscope size={16} className="text-slate-400 shrink-0" />
                                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight truncate">
                                                                {(() => {
                                                                    const raw = apt.doctorName || apt.doctor?.user?.name || apt.doctor?.name;
                                                                    if (!raw || raw.toLowerCase().includes('pending')) return 'Pending Assignment';
                                                                    return formatDoctorName(raw);
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-3 flex items-center gap-2 justify-end pr-2">
                                                        {/* Edit Button: allowed for online & offline before doctor starts */}
                                                        {!['in-progress', 'completed', 'cancelled'].includes(apt.status?.toLowerCase()) && (
                                                            <button
                                                                onClick={() => handleOpenEdit(apt)}
                                                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                                                title="Edit Appointment Details"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                        )}

                                                        {['booked', 'pending', 'scheduled'].includes(apt.status?.toLowerCase()) ? (
                                                            <button
                                                                onClick={() => handleOpenCheckIn(apt)}
                                                                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-teal-700 shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                                                                title="Patient arrived at Frontdesk"
                                                            >
                                                                <UserCheck size={12} /> {(apt as any).type?.toLowerCase() === 'online' ? 'Check-In' : 'Send'}
                                                            </button>
                                                        ) : (
                                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${apt.status?.toLowerCase() === 'confirmed' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                                                apt.status?.toLowerCase() === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    apt.status?.toLowerCase() === 'Completed' || apt.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                                }`}>
                                                                {apt.status?.toLowerCase() === 'confirmed' ? (
                                                                    <><CheckCircle2 size={12} /> Waiting</>
                                                                ) : apt.status?.toLowerCase() === 'in-progress' ? (
                                                                    <><Activity size={12} className="animate-pulse" /> Waiting</>
                                                                ) : apt.status?.toLowerCase() === 'completed' ? (
                                                                    <><CheckCircle2 size={12} /> Completed</>
                                                                ) : apt.status.toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mobile View (Card Layout) */}
                                                <div className="sm:hidden flex flex-col p-4 mb-3 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                                                    {/* Row 1: Index + Avatar + Name + Type */}
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-black text-slate-400 mb-1">
                                                                    #{(apt as any).token_number ? `T-${(apt as any).token_number}` : (activeTab === 'active' ? (idx + 1).toString().padStart(2, '0') : ((historyPage - 1) * itemsPerPage + idx + 1).toString().padStart(2, '0'))}
                                                                </span>
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base bg-slate-900 text-white`}>
                                                            {formatPatientDisplayName(apt.patient, apt, true).charAt(0).toUpperCase()}
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[140px]">
                                                                {formatPatientDisplayName(apt.patient, apt, true)}
                                                                </h4>
                                                                <div className="mt-1 flex items-center gap-1">
                                                                    {(apt as any).isMobile || (apt as any).bookingChannel === 'app' || (apt as any).source === 'app' ? (
                                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                            <Smartphone size={8} /> App
                                                                        </span>
                                                                    ) : (apt as any).type?.toLowerCase() === 'online' ? (
                                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200">
                                                                            <Globe size={8} /> Website
                                                                        </span>
                                                                    ) : (apt as any).type === 'EMERGENCY' ? (
                                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block bg-rose-50 text-rose-600 border border-rose-100">
                                                                            Emergency
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block bg-slate-100 text-slate-600 border border-slate-200">
                                                                            Offline
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[10px] font-black uppercase text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded leading-none">
                                                                {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "N/A"}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                                {formatTimeTo12h(apt.appointmentTime || apt.startTime || apt.time)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Secondary Info (MRN / Doctor) */}
                                                    <div className="grid grid-cols-2 gap-3 py-2 border-y border-dashed border-slate-100">
                                                        <div>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Patient MRN</p>
                                                            <p className="text-[10px] font-bold text-slate-700">{(apt as any).mrn || 'N/A'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Assigned Doctor</p>
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Stethoscope size={10} className="text-slate-400" />
                                                                <span className="text-[10px] font-bold text-slate-700 uppercase truncate max-w-[100px]">
                                                                    {(() => {
                                                                        const raw = apt.doctorName || apt.doctor?.user?.name || apt.doctor?.name;
                                                                        if (!raw || raw.toLowerCase().includes('pending')) return 'Pending';
                                                                        return formatDoctorName(raw);
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 3: Actions / Status */}
                                                    <div className="flex items-center justify-between pointer-events-auto">
                                                        <span className="text-[9px] font-bold text-slate-300 italic uppercase">Curechain Portal</span>
                                                        <div className="flex items-center gap-2">
                                                            {!['in-progress', 'completed', 'cancelled'].includes(apt.status?.toLowerCase()) && (
                                                                <button
                                                                    onClick={() => handleOpenEdit(apt)}
                                                                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-slate-200 cursor-pointer"
                                                                    title="Edit Appointment"
                                                                >
                                                                    <Pencil size={11} />
                                                                </button>
                                                            )}

                                                            {['booked', 'pending', 'scheduled'].includes(apt.status?.toLowerCase()) ? (
                                                                <button
                                                                    onClick={() => handleOpenCheckIn(apt)}
                                                                    className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <UserCheck size={11} /> {(apt as any).type?.toLowerCase() === 'online' ? 'Check-In' : 'Confirm'}
                                                                </button>
                                                            ) : (
                                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${apt.status?.toLowerCase() === 'confirmed' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                                                    apt.status?.toLowerCase() === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                        apt.status?.toLowerCase() === 'Completed' || apt.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                                    }`}>
                                                                    {apt.status?.toLowerCase() === 'confirmed' ? (
                                                                        <><CheckCircle2 size={12} /> Waiting</>
                                                                    ) : apt.status?.toLowerCase() === 'in-progress' ? (
                                                                        <><Activity size={12} className="animate-pulse" /> Waiting</>
                                                                    ) : apt.status?.toLowerCase() === 'completed' ? (
                                                                        <><CheckCircle2 size={12} /> Completed</>
                                                                    ) : apt.status.toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100">
                                        <Activity size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">No Appointments</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Everything is clear on the schedule</p>
                                </div>
                            )}
                        </div>

                        {/* FOOTER / PAGINATION */}
                        <div className="p-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-4">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">System Status: Online</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Facility: {stats.hospitalName || "Hospital Main"}</p>
                            </div>

                        </div>
                    </div>
                </div>

            </div>

            {/* CHECK-IN PAYMENT & CONFIRMATION MODAL */}
            {isCheckInModalOpen && checkingInApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col my-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">Frontdesk Check-In</h3>
                                <p className="text-teal-100 text-xs font-medium mt-0.5">Collect consultation fee & dispatch to doctor</p>
                            </div>
                            <button
                                onClick={() => setIsCheckInModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content Body - Scrollable */}
                        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Patient Info Card */}
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</span>
                                    {(() => {
                                        const isApp = checkingInApt.isMobile || checkingInApt.bookingChannel === 'app' || checkingInApt.source === 'app';
                                        const isWebsite = !isApp && (checkingInApt.bookingChannel === 'website' || (checkingInApt as any).type?.toLowerCase() === 'online');
                                        if (isApp) {
                                            return (
                                                <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase tracking-wide flex items-center gap-1">
                                                    📱 App Booking
                                                </span>
                                            );
                                        }
                                        if (isWebsite) {
                                            return (
                                                <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 uppercase tracking-wide flex items-center gap-1">
                                                    🌐 Website Booking
                                                </span>
                                            );
                                        }
                                        return (
                                            <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide">
                                                Offline Booking
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="text-xs sm:text-sm font-black text-slate-800 uppercase">
                                    {formatPatientDisplayName(checkingInApt.patient, checkingInApt, true)}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                    <span>Phone: {checkingInApt.patient?.mobile || checkingInApt.patientDetails?.phone || checkingInApt.phone || 'N/A'}</span>
                                    <span>Doctor: {formatDoctorName(checkingInApt.doctorName || checkingInApt.doctor?.user?.name || checkingInApt.doctor?.name) || 'Doctor'}</span>
                                </div>
                            </div>

                            {/* Fee Card */}
                            {(() => {
                                const isPrePaid = checkingInApt.isMobile || 
                                    checkingInApt.bookingChannel === 'app' || 
                                    checkingInApt.source === 'app' || 
                                    checkingInApt.paymentStatus?.toLowerCase() === 'paid';
                                return (
                                    <div className={`flex items-center justify-between p-3 rounded-2xl border ${
                                        isPrePaid ? 'bg-emerald-50/70 border-emerald-200' : 'bg-teal-50/50 border-teal-100'
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center ${
                                                isPrePaid ? 'bg-emerald-600' : 'bg-teal-600'
                                            }`}>
                                                <Banknote size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Consultation Fee</p>
                                                <p className={`text-base font-black ${isPrePaid ? 'text-emerald-800' : 'text-teal-800'}`}>
                                                    ₹{checkingInApt.fee || (checkingInApt as any).consultationFee || checkingInApt.amount || 300}
                                                </p>
                                            </div>
                                        </div>
                                        {isPrePaid ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-600 text-white rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Status: Paid
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-700 mt-0.5">Pre-paid via App</span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md uppercase">
                                                Status: Unpaid
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Payment Mode Selection — hidden for pre-paid app patients */}
                            {(() => {
                                const isPrePaidApp = checkingInApt.isMobile || checkingInApt.bookingChannel === 'app' || checkingInApt.source === 'app' || checkingInApt.paymentStatus?.toLowerCase() === 'paid';
                                if (isPrePaidApp) {
                                    return (
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Payment Already Received</p>
                                                <p className="text-[10px] font-medium text-emerald-700 mt-0.5">Paid via Mobile App · No collection needed at front desk</p>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                <div>
                                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Select Payment Mode</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'cash', label: 'Cash', icon: Banknote },
                                        { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                                        { id: 'card', label: 'Card', icon: CreditCard },
                                        { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                                        { id: 'mixed', label: 'Mixed', icon: Layers },
                                        { id: 'unpaid', label: 'Exempt / Free', icon: Clock },
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            onClick={() => setPaymentMode(mode.id as any)}
                                            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all text-xs font-bold cursor-pointer ${
                                                paymentMode === mode.id
                                                    ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-600/20 shadow-xs'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            <mode.icon size={15} className={paymentMode === mode.id ? 'text-teal-600' : 'text-slate-400'} />
                                            <span className="truncate">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Mixed Payment Split Options */}
                                {paymentMode === 'mixed' && (
                                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Mixed Breakdown</span>
                                            <span className="text-[10px] font-bold text-slate-500">Total Due: ₹{checkingInApt.fee || checkingInApt.amount || 300}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cash (₹)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={mixedPayments.cash}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={(e) => updateMixedPayment('cash', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">UPI / QR (₹)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={mixedPayments.upi}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={(e) => updateMixedPayment('upi', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Card (₹)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={mixedPayments.card}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={(e) => updateMixedPayment('card', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Bank Transfer (₹)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={mixedPayments.bankTransfer}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={(e) => updateMixedPayment('bankTransfer', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                        </div>
                                        {(() => {
                                            const totalEntered = Math.max(0, Number(mixedPayments.cash || 0)) + Math.max(0, Number(mixedPayments.card || 0)) + Math.max(0, Number(mixedPayments.upi || 0)) + Math.max(0, Number(mixedPayments.bankTransfer || 0));
                                            const required = Number(checkingInApt.fee || checkingInApt.amount || 300);
                                            const diff = required - totalEntered;
                                            return (
                                                <div className={`flex items-center justify-between text-[10px] font-bold pt-1 border-t border-slate-200 ${diff === 0 ? 'text-teal-600' : diff > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                    <span>Sum: ₹{totalEntered}</span>
                                                    <span>{diff === 0 ? '✓ Balanced' : diff > 0 ? `Remaining: ₹${diff}` : `Over by: ₹${Math.abs(diff)}`}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                                </div>
                                );
                            })()}
                        </div>

                        {/* Pinned Footer Actions */}
                        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCheckInModalOpen(false)}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors uppercase cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCheckIn}
                                disabled={isSubmittingCheckIn}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                                    checkingInApt.isMobile || checkingInApt.bookingChannel === 'app' || checkingInApt.source === 'app' || checkingInApt.paymentStatus?.toLowerCase() === 'paid'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-teal-600 hover:bg-teal-700'
                                }`}
                            >
                                {isSubmittingCheckIn ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                    <UserCheck size={14} />
                                )}
                                {checkingInApt.isMobile || checkingInApt.bookingChannel === 'app' || checkingInApt.source === 'app' || checkingInApt.paymentStatus?.toLowerCase() === 'paid'
                                    ? 'Confirm & Dispatch to Doctor'
                                    : 'Confirm Check-In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
        
        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(13, 148, 136, 0.5), 0 0 10px rgba(13, 148, 136, 0.3);
            opacity: 1;
          }
          50% {
            text-shadow: 0 0 10px rgba(13, 148, 136, 0.8), 0 0 20px rgba(13, 148, 136, 0.5);
            opacity: 0.8;
          }
        }
      `}</style>
        </div>
    );
}

const colors = {
    teal: "bg-teal-600 text-white shadow-teal-500/10",
    slate: "bg-slate-900 text-white shadow-slate-900/10",
    rose: "bg-rose-600 text-white shadow-rose-500/10",
    emerald: "bg-emerald-600 text-white shadow-emerald-500/10"
} as const;

const StatCard = React.memo(function StatCard({ icon, title, value, trend, color, typeFilter, onTypeChange }: {
    icon: React.ReactElement;
    title: string;
    value: string | number;
    trend?: string;
    color: keyof typeof colors;
    typeFilter?: 'all' | 'opd' | 'ipd';
    onTypeChange?: (type: 'all' | 'opd' | 'ipd') => void;
}) {

    return (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm group flex flex-col gap-3 hover:border-teal-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]} group-hover:scale-110 shadow-lg transition-transform`}>
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 3 })}
                </div>
                {/* OPD/IPD Toggle */}
                {onTypeChange && (
                    <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
                        {(['all', 'opd', 'ipd'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTypeChange(type);
                                }}
                                className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded-md transition-all ${typeFilter === type
                                    ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 text-[7px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded uppercase border border-teal-100">
                        <Activity size={8} /> Live
                    </div>


                </div>
            </div>
            <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
                <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-bold text-slate-900 tabular-nums tracking-tight">{value}</h3>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{trend}</p>
                </div>
            </div>
        </div>
    );
});

export default React.memo(HelpdeskDashboard);
