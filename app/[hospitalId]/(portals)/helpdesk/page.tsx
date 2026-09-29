"use client";

import React, { useState, useMemo, useCallback } from "react";
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
    FileText
} from "lucide-react";
import { generateBlankLetterheadHtml } from "@/lib/print-utils";
import Link from "next/link";
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
import { AttendanceModal } from "@/components/attendance/AttendanceModal";
import { HelpdeskDashboardSkeleton } from "@/components/ui/skeletons";
import { useAuthStore } from "@/stores/authStore";
import { sanitizePatientName, formatDoctorName } from "@/lib/utils/name-utils";

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
                    return type === 'opd' || type === 'consultation';
                }
                return type === visitTypeFilter.toLowerCase();
            });
        }

        return list;
    }, [dashboardData, appointmentsData, selectedDoctorId, startDateFilter, endDateFilter, visitTypeFilter]);

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
                    
                    <button
                        onClick={handlePrintLetterhead}
                        className="flex items-center gap-0.5 sm:gap-2 px-2 sm:px-5 py-1.5 sm:py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg sm:rounded-xl text-[7.5px] sm:text-[10px] font-bold uppercase tracking-widest hover:border-teal-500 hover:text-teal-600 shadow-sm"
                    >
                        <FileText size={10} className="sm:size-[16px]" />
                        <span className="hidden md:inline">Print Letterhead</span>
                        <span className="md:hidden">Template</span>
                    </button>
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
                                                    <div className="col-span-1 border-r border-slate-100">
                                                        <span className="text-xs font-black text-slate-300">
                                                            {activeTab === 'active' ? (idx + 1).toString().padStart(2, '0') : ((historyPage - 1) * itemsPerPage + idx + 1).toString().padStart(2, '0')}
                                                        </span>
                                                    </div>

                                                    <div className="col-span-3 flex items-center gap-4 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white'
                                                            }`}>
                                                            {sanitizePatientName(apt.patientName).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">
                                                                {sanitizePatientName(apt.patientName)}
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
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block ${(apt as any).type === 'EMERGENCY' ? 'bg-rose-50 text-rose-600 border border-rose-100' : (apt as any).type === 'IPD' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                            {(apt as any).type?.toUpperCase() === 'CONSULTATION' ? 'OPD' : ((apt as any).type || 'OPD')}
                                                        </span>
                                                    </div>

                                                    <div className="col-span-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Stethoscope size={16} className="text-slate-400 shrink-0" />
                                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight truncate">
                                                                {formatDoctorName(apt.doctorName || apt.doctor?.user?.name || apt.doctor?.name) || "Pending Assign"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-3 flex items-center gap-3 justify-end pr-2">
                                                        {['Booked', 'pending'].includes(apt.status) ? (
                                                            <button
                                                                onClick={() => handleUpdateStatus((apt as any).id || (apt as any)._id, 'confirmed')}
                                                                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-teal-700 shadow-md active:scale-95"
                                                            >
                                                                Send
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
                                                                <span className="text-[10px] font-black text-slate-300 mb-1">#{activeTab === 'active' ? (idx + 1).toString().padStart(2, '0') : ((historyPage - 1) * itemsPerPage + idx + 1).toString().padStart(2, '0')}</span>
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base bg-slate-900 text-white`}>
                                                            {(apt.patient?.name || apt.patientName || "U").charAt(0).toUpperCase()}
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[140px]">
                                                                {apt.patient?.name || apt.patientName || "Unknown Patient"}
                                                                </h4>
                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block ${(apt as any).type === 'EMERGENCY' ? 'bg-rose-50 text-rose-600 border border-rose-100' : (apt as any).type === 'IPD' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                                    {(apt as any).type?.toUpperCase() === 'CONSULTATION' ? 'OPD' : ((apt as any).type || 'OPD')}
                                                                </span>
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
                                                                    {formatDoctorName(apt.doctorName || apt.doctor?.user?.name || apt.doctor?.name) || "Pending"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 3: Actions / Status */}
                                                    <div className="flex items-center justify-between pointer-events-auto">
                                                        <span className="text-[9px] font-bold text-slate-300 italic uppercase">Curechain Portal</span>
                                                        <div className="flex items-center gap-3">
                                                            {['Booked', 'pending'].includes(apt.status) ? (
                                                                <button
                                                                    onClick={() => handleUpdateStatus((apt as any).id || (apt as any)._id, 'confirmed')}
                                                                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 shadow-lg shadow-teal-500/20 active:scale-95"
                                                                >
                                                                    Confirm Waiting
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
