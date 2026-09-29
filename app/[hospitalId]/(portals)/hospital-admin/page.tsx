"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import dynamic from 'next/dynamic';
import Link from 'next/link';

// ✅ CRITICAL: Dynamic import must be at MODULE level (outside component)
// If placed inside the component, React recreates a new component type on every render,
// causing the modal to unmount/remount on each 10-second data refetch.
const ReminderConfigModal = dynamic(
  () => import('./components/ReminderConfigModal'),
  { ssr: false }
);

import {
  Users,
  Building2,
  Stethoscope,
  Activity,
  Clock,
  ArrowUpRight,
  Wallet,
  CalendarCheck,
  AlertCircle,
  RefreshCw,
  Monitor,
  TestTube,
  Pill,
  Headphones,
  BellRing,
  Settings
} from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/admin";
import LiveFeedbackWidget from './components/LiveFeedbackWidget';
import { BrandingModal } from '@/components/hospital-admin/BrandingModal';

// Dynamic import for charts
const AttendancePieChart = dynamic(
  () => import('@/components/charts/OptimizedCharts'),
  {
    ssr: false, // Don't render on server
    loading: () => (
      <div className="h-[180px] w-full flex items-center justify-center">
        <div className="h-8 w-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }
);

const CHART_COLORS = ['#10b981', '#1b1917ff', '#ef4444', '#6366f1'];

function HospitalAdminDashboard() {
  const [range, setRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visitType, setVisitType] = useState<"all" | "opd" | "ipd">("all");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  // Fetch doctors for the filter
  const { data: doctorsData } = useQuery<any>({
    queryKey: ['hospital-admin', 'doctors-list'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getDoctors();
      return resp;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Main dashboard data
  const { data: dashboardData, isLoading, error, refetch, isFetching } = useQuery<any>({
    queryKey: ['hospital-admin', 'dashboard', range, startDate, endDate, visitType, selectedDoctorId],
    queryFn: async () => {
      const data = await hospitalAdminService.getDashboard({
        range,
        startDate,
        endDate,
        visitType,
        doctorId: selectedDoctorId === 'all' ? undefined : selectedDoctorId
      } as any);
      return data;
    },
    staleTime: 30000, // 30s cache for smoother navigation
    gcTime: 15 * 60 * 1000,
    retry: 2,
    refetchInterval: 30000, // Poll every 30 seconds (balanced for performance)
    refetchOnWindowFocus: true,
    placeholderData: (previousData: any) => previousData,
  });

  const { hospital = {}, stats = {} } = dashboardData || {};

  // ✅ PERFORMANCE: Memoize shared calculations
  const { totalStaff, attendanceRate } = useMemo(() => {
    const total = (stats.totalDoctors || 0) + (stats.totalNurses || 0) + (stats.totalStaff || 0);
    const rate = total > 0 ? Math.round((stats.attendance?.present || 0) / total * 100) : 0;
    return { totalStaff: total, attendanceRate: rate };
  }, [stats]);

  const getMetricDetails = useCallback((label: string) => {

    const details: Record<string, { items: { label: string, value: string | number }[], insight: string }> = {
      "Active Doctors": {
        items: [
          { label: "Total Active", value: stats.totalDoctors || 0 },
          { label: "Present Today", value: Math.round((stats.totalDoctors || 0) * attendanceRate / 100) },
          { label: "On Leave", value: stats.attendance?.onLeave || 0 },
          { label: "Appointments", value: stats.totalAppointments || 0 }
        ],
        insight: `${stats.totalDoctors || 0} doctors available. Attendance rate: ${attendanceRate}%`
      },
      "Active Nurses": {
        items: [
          { label: "Total Nurses", value: stats.totalNurses || 0 },
          { label: "On Duty", value: Math.round((stats.totalNurses || 0) * attendanceRate / 100) },
          { label: "Total Staff", value: stats.totalStaff || 0 },
          { label: "Support Desk", value: stats.totalHelpdesk || 0 }
        ],
        insight: `Nursing staff at ${attendanceRate}% capacity with ${stats.totalNurses || 0} active nurses.`
      },
      "Total Staff": {
        items: [
          { label: "Total Staff", value: stats.totalStaff || 0 },
          { label: "On Duty", value: stats.todayAttendance || 0 },
          { label: "On Leave", value: stats.pendingLeaves || 0 },
          { label: "Departments", value: "All" }
        ],
        insight: `Total ${stats.totalStaff || 0} non-clinical staff members. ${stats.todayAttendance || 0} currently present.`
      },
      "Total Patients": {
        items: [
          { label: "Total Patients", value: stats.totalPatients || 0 },
          { label: "Appointments", value: stats.totalAppointments || 0 },
          { label: "Inpatients", value: stats.totalInpatients || 0 },
          { label: "Admissions", value: stats.totalAdmissions || 0 }
        ],
        insight: `${stats.totalPatients || 0} registered patients with ${stats.totalInpatients || 0} currently admitted.`
      },
      "Avg. Patient Wait": {
        items: [
          { label: "Average Wait", value: `${stats.avgPatientWaitTime || 0}m` },
          { label: "Active Queue", value: stats.totalAppointments || 0 },
          { label: "Lab Orders", value: stats.totalLabRequests || 0 },
          { label: "Pharmacy", value: stats.totalPharmaSales || 0 }
        ],
        insight: stats.avgPatientWaitTime > 30
          ? `Wait time of ${stats.avgPatientWaitTime}m is above target. Monitor queue.`
          : `Wait time of ${stats.avgPatientWaitTime}m is within acceptable range.`
      },
      "Avg. Consultation": {
        items: [
          { label: "Average Time", value: `${stats.avgConsultationTime || 0}m` },
          { label: "Appointments", value: stats.totalAppointments || 0 },
          { label: "Doctors", value: stats.totalDoctors || 0 },
          { label: "Per Doctor", value: stats.totalDoctors > 0 ? Math.round((stats.totalAppointments || 0) / stats.totalDoctors) : 0 }
        ],
        insight: `Average consultation ${stats.avgConsultationTime || 0} minutes with ${stats.totalAppointments || 0} ${visitType.toUpperCase()} appointments.`
      },
      "Number of Lab Tests Gained": {
        items: [
          { label: "Total Tests", value: stats.totalLabRequests || 0 },
          { label: "Today", value: stats.totalLabRequests || 0 },
          { label: "Revenue", value: `₹${(stats.labRevenue || 0).toLocaleString()}` },
          { label: "Active Patients", value: stats.totalPatients || 0 }
        ],
        insight: `${stats.totalLabRequests || 0} lab tests processed. Lab Revenue: ₹${(stats.labRevenue || 0).toLocaleString()}.`
      },
      "Pharma Invoices Generated": {
        items: [
          { label: "Total Generated", value: stats.totalPharmaSales || 0 },
          { label: "Revenue", value: `₹${(stats.pharmaRevenue || 0).toLocaleString()}` },
          { label: "Inpatient", value: stats.totalInpatients || 0 },
          { label: "Outpatient", value: stats.totalAppointments || 0 }
        ],
        insight: `${stats.totalPharmaSales || 0} pharmacy invoices generated. Pharma Revenue: ₹${(stats.pharmaRevenue || 0).toLocaleString()}.`
      },
      "Admissions (IPD)": {
        items: [
          { label: "Total Admissions", value: stats.totalAdmissions || 0 },
          { label: "Still on Bed", value: stats.ipdActive || 0 },
          { label: "Discharged Today", value: stats.ipdDischarged || 0 },
          { label: "IPD Bill Revenue", value: `₹${(stats.ipdRevenue || 0).toLocaleString()}` },
          { label: "Bed Occupancy", value: `${stats.bedOccupancy || 0}%` },
        ],
        insight: `${stats.ipdActive || 0} patients currently admitted. Total admissions generating ₹${(stats.ipdRevenue || 0).toLocaleString()} in revenue.`
      },
      "OPD Appointments": {
        items: [
          { label: "Total Appts", value: stats.totalAppointments || 0 },
          { label: "Finished", value: stats.opdCompleted || 0 },
          { label: "Pending", value: stats.opdPending || 0 },
          { label: "OPD Bill Revenue", value: `₹${(stats.opdRevenue || 0).toLocaleString()}` },
          { label: "Avg. Consult", value: `${stats.avgConsultationTime || 0}m` },
          { label: "Wait Time", value: `${stats.avgPatientWaitTime || 0}m` }
        ],
        insight: `${stats.opdCompleted || 0} finished, ${stats.opdPending || 0} waiting. Generating ₹${(stats.opdRevenue || 0).toLocaleString()} in revenue today.`
      },
      "Revenue": {
        items: [
          { label: "Total Revenue", value: `₹${(stats.revenue || stats.monthlyRevenue || 0).toLocaleString()}` },
          { label: "OPD Bill", value: `₹${(stats.opdRevenue || 0).toLocaleString()}` },
          { label: "IPD Bill", value: `₹${(stats.ipdRevenue || 0).toLocaleString()}` },
          { label: "Pharma Bill", value: `₹${(stats.pharmaRevenue || 0).toLocaleString()}` },
          { label: "Lab Bill", value: `₹${(stats.labRevenue || 0).toLocaleString()}` }
        ],
        insight: `Consolidated ₹${(stats.revenue || stats.monthlyRevenue || 0).toLocaleString()} across all institutional streams.`
      }
    };
    return details[label] || { items: [], insight: "" };
  }, [stats, attendanceRate, totalStaff]);

  // Memoized stat cards with real data
  const primaryStats = useMemo(() => [
    {
      label: "Active Doctors",
      value: stats.totalDoctors || 0,
      icon: Stethoscope,
      color: "emerald",
      href: "/hospital-admin/doctors"
    },
    {
      label: "Active Nurses",
      value: stats.totalNurses || 0,
      icon: Activity,
      color: "blue",
      href: "/hospital-admin/nurses"
    },
    {
      label: "Total Staff",
      value: stats.totalStaff || 0,
      icon: Users,
      color: "orange",
      href: "/hospital-admin/staff"
    },
    {
      label: "Total Patients",
      value: stats.totalPatients || 0,
      icon: Users,
      color: "indigo",
      href: "/hospital-admin/patients"
    }
  ], [stats]);

  const performanceStats = useMemo(() => [
    {
      label: "Avg. Patient Wait",
      value: `${stats.avgPatientWaitTime || 0} min`,
      icon: Clock,
      color: "amber",
    },
    {
      label: "Avg. Consultation",
      value: `${stats.avgConsultationTime || 0} min`,
      icon: Stethoscope,
      color: "emerald",
    },
    {
      label: "Number of Lab Tests Gained",
      value: stats.totalLabRequests || 0,
      icon: TestTube,
      color: "indigo",
    },
    {
      label: "Pharma Invoices Generated",
      value: stats.totalPharmaSales || 0,
      icon: Pill,
      color: "rose",
    },
    {
      label: `${range === 'today' ? "Today's" : range === '7days' ? "Weekly" : range === 'month' ? "Monthly" : range === 'year' ? "Yearly" : "Filtered"} Admissions (IPD)`,
      value: stats.totalAdmissions || 0,
      bill: stats.ipdRevenue || 0,
      status: `(${stats.ipdActive || 0} In-Bed | ${stats.ipdDischarged || 0} Discharged)`,
      icon: CalendarCheck,
      color: "blue",
    },
    {
      label: "OPD Appointments",
      value: stats.totalAppointments || 0,
      bill: stats.opdRevenue || 0,
      status: `(${stats.opdCompleted || 0} Finished | ${stats.opdPending || 0} Pending)`,
      icon: Activity,
      color: "emerald",
    },
    {
      label: "Revenue",
      value: `₹${(stats.revenue || stats.monthlyRevenue || 0).toLocaleString()}`,
      icon: Wallet,
      color: "emerald",
    }
  ], [stats, range, visitType]);

  // Attendance chart data
  const attendanceChartData = useMemo(() => {
    const data = [
      { name: 'Present', value: stats.attendance?.present || 0 },
      { name: 'Late', value: stats.attendance?.late || 0 },
      { name: 'Absent', value: stats.attendance?.absent || 0 },
      { name: 'On Leave', value: stats.attendance?.onLeave || 0 },
    ].filter(d => d.value > 0);
    return data.length === 0 ? [{ name: 'No Data', value: 1 }] : data;
  }, [stats.attendance]);



  // Show error state only when there's an error and no cached data
  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Failed to load dashboard data</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show skeleton on initial load with refined aesthetics
  if (isLoading && !dashboardData) {
    return (
      <div className="p-1 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-4 w-40 bg-slate-100 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* Primary Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl p-3 md:p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-100 rounded-xl animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
              ))}
            </div>
            <div className="h-64 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
          </div>
          <div className="space-y-6">
            <div className="h-40 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
            <div className="h-96 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5 bg-slate-50/50 min-h-screen flex flex-col pb-12">
      {/* Unified Top Action Bar */}
      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 shrink-0">
        
        {/* Heading */}
        <div className="shrink-0 flex items-center gap-2 px-1">
          <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
             <Monitor className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col justify-center">
             <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                   Dashboard Overview
                </h1>
                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800 shrink-0">
                   Live Control
                </span>
             </div>
             <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1.5 md:mt-1 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-500" />
                {hospital?.name || "Hospital Node"}
             </p>
          </div>
        </div>

        {/* Actions Row */}
        <div className="w-full flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between xl:justify-end">
            
            {/* Date Filters & Range */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Date Input */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-1 text-xs shadow-sm w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mr-1">Date</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setRange('custom');
                        }}
                        className="bg-transparent border-none text-[9px] md:text-[10px] font-bold outline-none text-gray-700 dark:text-gray-300 py-0.5 focus:ring-0 uppercase tracking-widest min-w-[100px]"
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setRange('custom');
                        }}
                        className="bg-transparent border-none text-[9px] md:text-[10px] font-bold outline-none text-gray-700 dark:text-gray-300 py-0.5 focus:ring-0 uppercase tracking-widest min-w-[100px]"
                    />
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(""); setEndDate(""); setRange('today'); }}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 ml-1 px-1"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Quick Range */}
                <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-100 dark:border-gray-800 shrink-0">
                    {[
                      { key: 'today', label: 'Today' },
                      { key: '7days', label: '7D' },
                      { key: 'month', label: 'Month' },
                      { key: 'year', label: 'Year' },
                    ].map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setRange(r.key)}
                            className={`px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all ${range === r.key
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Visit Type */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-100 dark:border-gray-800 shrink-0">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'opd', label: 'OPD' },
                  { key: 'ipd', label: 'IPD' },
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setVisitType(v.key as any)}
                    className={`px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all ${visitType === v.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    {v.label}
                  </button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }}
                  className="p-1.5 md:p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg shadow-sm transition-all group"
                  title="Refresh Dashboard"
                >
                  <RefreshCw size={14} className={`group-hover:rotate-180 transition-transform duration-500 ${isFetching ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
                </button>

                <button
                  onClick={() => setIsBrandingModalOpen(true)}
                  className="p-1.5 md:p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg shadow-sm transition-all"
                  title="Receipt Meta"
                >
                  <Settings size={14} />
                </button>

                <button
                  onClick={() => setIsReminderModalOpen(true)}
                  className="p-1.5 md:p-2 bg-slate-900 dark:bg-gray-100 border border-slate-900 dark:border-gray-100 text-white dark:text-gray-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg shadow-sm transition-all"
                  title="Reminder Settings"
                >
                  <BellRing size={14} />
                </button>
            </div>
        </div>
      </div>

      {/* Primary Personnel Cards (Static Context) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 shrink-0">
        {primaryStats.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <Card className="p-2 md:p-3 lg:p-3 xl:p-4 border-slate-100 shadow-sm bg-white hover:border-slate-300 transition-all group relative overflow-hidden">
              <div className="flex items-center gap-2 md:gap-3 relative z-10">
                <div className={`p-1.5 md:p-2 rounded-xl md:rounded-2xl transition-colors ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' :
                  stat.color === 'blue' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' :
                    stat.color === 'orange' ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' :
                      'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                  }`}>
                  <stat.icon size={16} strokeWidth={2.5} className="md:w-4 md:h-4" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <p className="text-[7px] md:text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">{stat.label}</p>
                  <p className="text-xs md:text-lg font-black text-slate-900 truncate">{stat.value}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>


      {/* Performance Grid (Dynamic with Advanced Overlays) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3 shrink-0">
        {performanceStats.map((stat, index) => {
          const detailKey = stat.label.includes("Admissions") ? "Admissions (IPD)" : stat.label;
          const details = getMetricDetails(detailKey);
          const isHovered = hoveredCard === stat.label;
          return (
            <div
              key={index}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredCard(stat.label)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <Card className={`p-2 md:p-3 lg:p-3 xl:p-4 border-slate-100 shadow-sm transition-all h-full bg-white relative z-10 ${isHovered ? 'border-slate-300 ring-4 ring-slate-100 shadow-md' : ''}`}>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className={`p-1 md:p-2 rounded-lg md:rounded-xl ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                    stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                      stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                        stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                          'bg-blue-50 text-blue-600'
                    }`}>
                    <stat.icon size={14} strokeWidth={2.5} className="md:w-4 md:h-4" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex px-1.5 md:px-2 py-0.5 bg-slate-50 text-slate-400 text-[6.5px] md:text-[8px] font-black uppercase tracking-tighter rounded border border-slate-100">
                      {range === '7days' ? '7D' : range === 'custom' ? 'Range' : range.toUpperCase()}
                    </span>
                    {visitType !== 'all' &&
                      stat.label !== 'OPD Appointments' &&
                      !stat.label.includes('Admissions (IPD)') && (
                        <span className={`inline-flex px-1.5 md:px-2 py-0.5 ${visitType === 'opd' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'} text-[6.5px] md:text-[8px] font-black uppercase tracking-tighter rounded border`}>
                          {visitType.toUpperCase()}
                        </span>
                      )}
                  </div>
                  {isHovered && <ArrowUpRight size={12} className="text-slate-300 animate-in fade-in slide-in-from-bottom-1" />}
                </div>
                <div>
                  <p className="text-[7.5px] md:text-[8.5px] font-black text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.15em] mb-1 line-clamp-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-sm md:text-lg xl:text-xl font-black text-slate-900 truncate">{stat.value}</h4>
                  </div>
                  {(stat as any).bill !== undefined && (
                    <p className="text-[7px] md:text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">
                      Billing Flow: ₹{(stat as any).bill.toLocaleString()}
                    </p>
                  )}
                  {(stat as any).status && (
                    <p className="text-[6.5px] md:text-[7.5px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5 opacity-80">
                      {(stat as any).status}
                    </p>
                  )}
                </div>
              </Card>

              {/* Enhanced Floating Detail Overlay */}
              {isHovered && (
                <div className="absolute top-full left-0 right-0 mt-1 md:mt-2 p-2 md:p-3 bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-300 w-full overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-100 to-transparent"></div>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                    <div className={`w-4 h-4 md:w-6 md:h-6 rounded-lg flex items-center justify-center ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                      stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                      <stat.icon size={8} strokeWidth={3} className="md:w-3 md:h-3" />
                    </div>
                    <h4 className="text-[7.5px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest">{range.toUpperCase()} Analysis</h4>
                  </div>

                  <div className="space-y-1 md:space-y-1.5">
                    {details.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between group/item">
                        <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tight group-hover/item:text-slate-600 transition-colors">{item.label}</span>
                        <span className="text-[8px] md:text-[10px] font-black text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 md:mt-3 pt-1.5 md:pt-2 border-t border-slate-50">
                    <div className="flex gap-1.5 md:gap-2">
                      <div className="mt-0.5 shrink-0"><ArrowUpRight size={8} className="text-emerald-500 md:w-2.5 md:h-2.5" /></div>
                      <p className="text-[6.5px] md:text-[8px] font-bold text-slate-500 leading-relaxed italic opacity-90">
                        {details.insight}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Workforce Pulse Card - The 8th element in the grid */}
        <Card className="p-2 md:p-3 lg:p-3 xl:p-4 border-slate-100 shadow-sm bg-white h-full rounded-2xl md:rounded-[1.5rem] flex flex-col">
          <h3 className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center justify-between">
            Workforce Pulse
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          </h3>
          <div className="space-y-1.5 md:space-y-2 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between p-1.5 md:p-2 bg-indigo-50/50 rounded-xl border border-indigo-100 group transition-all hover:bg-indigo-50">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white text-indigo-600 rounded-lg shadow-sm"><Users size={12} /></div>
                <span className="text-[8px] md:text-[8.5px] font-bold text-slate-500 uppercase tracking-tighter">HR Staff</span>
              </div>
              <span className="text-xs md:text-base font-black text-slate-900">{stats.totalHR || 0}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 md:p-2 bg-amber-50/50 rounded-xl border border-amber-100 group transition-all hover:bg-amber-50">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white text-amber-600 rounded-lg shadow-sm"><Headphones size={12} /></div>
                <span className="text-[8px] md:text-[8.5px] font-bold text-slate-500 uppercase tracking-tighter">Info Desk</span>
              </div>
              <span className="text-xs md:text-base font-black text-slate-900">{stats.totalHelpdesk || 0}</span>
            </div>
          </div>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 items-stretch flex-1 min-h-[380px]">
        {/* Clinical Registry - Main Data Stream */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <Card className="p-3 md:p-4 lg:p-5 xl:p-6 border-slate-100 shadow-xl shadow-slate-100/50 bg-white rounded-[1.5rem] lg:rounded-[2rem] flex flex-col h-full overflow-hidden relative">
            {/* Loading Overlay */}
            {isFetching && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl z-50 flex items-center justify-center transition-all">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-slate-100">
                  <div className="h-4 w-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Updating Stream...</p>
                </div>
              </div>
            )}

            <div className="flex flex-col mb-3 md:mb-4 gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                <div>
                  <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-tight">Clinical Registry</h3>
                  <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase flex items-center gap-2 mt-0.5 md:mt-1">
                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-primary-theme rounded-full animate-pulse"></span>
                    Live Feed Active • {selectedDoctorId !== 'all' ? 'Filtering Active' : 'Global Flow'}
                  </p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="px-2 md:px-3 py-1 md:py-1.5 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl">
                    <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase">Load</p>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-900">
                      {(dashboardData?.liveQueue?.length || 0) > 5 ? 'High' : 'Optimal'}
                    </p>
                  </div>
                  <div className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-600 text-white rounded-lg md:rounded-xl shadow-lg flex items-center gap-2">
                    <Monitor size={12} className="text-white/60" />
                    <span className="text-[9px] font-black">{dashboardData?.liveQueue?.length || 0} Entities</span>
                  </div>
                </div>
              </div>

              {/* Compact Doctor Switcher */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedDoctorId('all')}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedDoctorId === 'all'
                    ? 'bg-primary-theme text-white border-primary-theme shadow-md'
                    : 'bg-white text-slate-400 border-slate-100'
                    }`}
                >
                  All
                </button>
                {(Array.isArray(doctorsData?.doctors) ? doctorsData.doctors : []).map((doc: any) => {
                  const profileId = doc.doctorProfileId || doc._id;
                  const doctorName = doc.name || doc.user?.name || "Doctor";
                  return (
                    <button
                      key={doc._id}
                      onClick={() => setSelectedDoctorId(profileId)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedDoctorId === profileId
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                        }`}
                    >
                      {doctorName.toLowerCase().startsWith('dr') ? doctorName : `Dr. ${doctorName}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1">
              {(dashboardData?.liveQueue || []).length > 0 ? (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20">
                  <div className="min-w-0">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 bg-white/50 sticky top-0 z-10 box-decoration-clone">
                      <div className="col-span-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</div>
                      <div className="col-span-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Patient</div>
                      <div className="col-span-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Doctor</div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {dashboardData.liveQueue.map((item: any, i: number) => (
                        <div key={item._id || i} className="grid grid-cols-12 gap-4 px-4 py-2.5 items-center hover:bg-white transition-colors group">
                          <div className="col-span-3">
                            <span className={`inline-flex px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase ${item.status === 'in-progress' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' :
                              item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="col-span-5 truncate text-[10px] font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.patientName?.toUpperCase()}
                          </div>
                          <div className="col-span-4 text-right truncate text-[9px] font-bold text-slate-500">
                            {item.doctorName}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[1.5rem] bg-white/50 py-10">
                  <Monitor size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No active monitoring data</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Attendance Analytics - Sidebar View */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <Card className="p-3 md:p-4 lg:p-5 border-slate-100 shadow-sm bg-white flex flex-col rounded-[1.5rem] lg:rounded-[2rem] h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 md:mb-4 shrink-0">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Attendance</h3>
              <Link href="/hospital-admin/attendance/overview" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 py-1">
              <div className="w-full h-full max-h-[140px] xl:max-h-[180px]">
                <AttendancePieChart
                  data={attendanceChartData}
                  colors={CHART_COLORS}
                  centerValue={stats.attendance?.present || 0}
                  centerLabel="Present"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 shrink-0">
              <div className="p-2 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 text-center">
                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Present</p>
                <p className="text-base md:text-xl font-black text-slate-900">{stats.attendance?.present || 0}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 text-center">
                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Leave</p>
                <p className="text-base md:text-xl font-black text-slate-900">{stats.attendance?.onLeave || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <ReminderConfigModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />

      <BrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
      />
    </div>
  );
}

export default React.memo(HospitalAdminDashboard);
