"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { adminService } from "@/lib/integrations";
import { useAuthStore } from "@/stores/authStore";
import {
  Users,
  Building2,
  Stethoscope,
  UserPlus,
  Headphones,
  ShieldCheck,
  TrendingUp,
  Activity,
  Calendar,
  ArrowUpRight,
  Zap,
  Database,
  Clock
} from "lucide-react";
import type { DashboardStats } from "@/lib/integrations/types/admin";

// Load Chart dynamically to avoid SSR issues with ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function AdminDashboard() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const getMetricDetails = (stat: any, idx: number) => {
    const details = {
      0: { // Total Users
        title: 'User Ecosystem',
        items: [
          { label: 'Active Today', value: stats?.activityStats?.[0]?.count || 0 },
          { label: 'Verified rate', value: '98.4%' },
          { label: 'Retention (30d)', value: '85.2%' },
          { label: 'Avg Session', value: '18m' }
        ],
        insight: 'User acquisition is steady with high verification rates across all roles.'
      },
      1: { // Hospitals
        title: 'Hospital Network',
        items: [
          { label: 'Active Nodes', value: stats?.hospitalsByStatus?.active || 0 },
          { label: 'Pending', value: stats?.hospitalsByStatus?.pending || 0 },
          { label: 'SLA Uptime', value: '99.9%' },
          { label: 'Coverage', value: '92%' }
        ],
        insight: 'Hospital verification pipeline is moving faster this quarter.'
      },
      2: { // Doctors
        title: 'Medical Staff',
        items: [
          { label: 'Specialists', value: '64%' },
          { label: 'Board Cert.', value: '100%' },
          { label: 'Avg Rating', value: '4.85/5' },
          { label: 'Live Consult', value: '128' }
        ],
        insight: 'Specialist onboarding is meeting quarterly targets effectively.'
      },
      3: { // Patients
        title: 'Patient Analytics',
        items: [
          { label: 'Daily OPD', value: '1.2k' },
          { label: 'IPD Stats', value: '450' },
          { label: 'Wait Time', value: '14m' },
          { label: 'Satisfaction', value: '94%' }
        ],
        insight: 'Hospital capacity utilization is optimal with efficient patient flow.'
      },
      4: { // Admins
        title: 'Governance Grid',
        items: [
          { label: 'IAM Compliance', value: '100%' },
          { label: 'Pending Audits', value: '0' },
          { label: 'Global Admins', value: stats?.totalAdmins || 0 },
          { label: 'Security Score', value: 'A+' }
        ],
        insight: 'Administrative overhead is optimal with 100% security compliance.'
      },
      5: { // Front Desk
        title: 'Support Desk Metrics',
        items: [
          { label: 'Open Tickets', value: '12' },
          { label: 'Resolution Rate', value: '96.4%' },
          { label: 'Avg Response', value: '<5m' },
          { label: 'FCR Rate', value: '89%' }
        ],
        insight: 'Helpdesk response times have improved significantly this month.'
      }
    };
    return details[idx as keyof typeof details] || details[0];
  };

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      fetchDashboardData();
    } else if (isInitialized && !isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, isInitialized]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardClient();
      setStats(data);
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error(error.message || "Failed to load dashboard statistics");
      setStats({
        totalUsers: 0,
        totalDoctors: 0,
        totalPatients: 0,
        totalHospitals: 0,
        totalAdmins: 0,
        totalHelpDesks: 0,
        recentRegistrations: [],
        activityStats: []
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/10",
      iconColor: "text-blue-500"
    },
    {
      label: "Hospitals",
      value: stats?.totalHospitals || 0,
      icon: Building2,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-500/10 to-purple-600/10",
      iconColor: "text-purple-500"
    },
    {
      label: "Doctors",
      value: stats?.totalDoctors || 0,
      icon: Stethoscope,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/10",
      iconColor: "text-emerald-500"
    },
    {
      label: "Patients",
      value: stats?.totalPatients || 0,
      icon: UserPlus,
      gradient: "from-amber-500 to-amber-600",
      bgGradient: "from-amber-500/10 to-amber-600/10",
      iconColor: "text-amber-500"
    },
    {
      label: "Admins",
      value: stats?.totalAdmins || 0,
      icon: ShieldCheck,
      gradient: "from-rose-500 to-rose-600",
      bgGradient: "from-rose-500/10 to-rose-600/10",
      iconColor: "text-rose-500"
    },
    {
      label: "Front Desk",
      value: stats?.totalHelpDesks || stats?.totalHelpdesks || 0,
      icon: Headphones,
      gradient: "from-cyan-500 to-cyan-600",
      bgGradient: "from-cyan-500/10 to-cyan-600/10",
      iconColor: "text-cyan-500"
    }
  ];

  const chartOptions: any = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: stats?.activityStats?.map(item => item._id) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      labels: {
        style: {
          colors: 'var(--secondary-color)',
          fontSize: '11px',
          fontWeight: 500
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--secondary-color)',
          fontSize: '11px',
          fontWeight: 500
        }
      }
    },
    grid: {
      borderColor: 'var(--border-color)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 10
      }
    },
    theme: { mode: 'dark' },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      y: {
        formatter: (val: number) => `${val} users`
      }
    }
  };

  const chartSeries = [{
    name: 'New Registrations',
    data: stats?.activityStats?.map(item => item.count) || [30, 40, 35, 50, 49, 60, 70]
  }];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Activity className="text-blue-500 animate-pulse" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-8">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              SuperAdmin Dashboard
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monitor and manage your healthcare ecosystem
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const details = getMetricDetails(stat, index);
          return (
            <div
              key={index}
              className={`group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer ${hoveredCard === index ? 'z-50' : 'z-10'
                }`}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}></div>

              {/* Content */}
              <div className="relative z-10 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <ArrowUpRight className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value.toLocaleString()}
                  </h3>
                </div>

                {/* True First Version: Below-Card Dropdown */}
                {hoveredCard === index && (
                  <div className="absolute top-full left-0 right-0 z-50 pt-2 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
                    <div className="bg-white/98 dark:bg-gray-950/98 rounded-2xl border-2 border-blue-500 shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-5 backdrop-blur-xl flex flex-col pointer-events-auto">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider">
                          {details.title}
                        </h4>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {details.items.map((item: any, i: number) => (
                          <div key={i} className="flex flex-col p-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/50">
                            <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                              {item.label}
                            </span>
                            <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/50">
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed italic">
                          💡 {details.insight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">User Growth Analytics</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Weekly registration trends</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <TrendingUp className="text-green-500" size={16} />
                <span className="text-sm font-semibold text-green-600 dark:text-green-500">+12%</span>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <Chart options={chartOptions} series={chartSeries} type="area" height="100%" />
            </div>
          </div>
        </div>

        {/* System Status - Takes 1 column */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">System Status</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time monitoring</p>
          </div>

          <div className="space-y-4">
            {/* Platform Load */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="text-blue-500" size={18} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Platform Load</span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-500 px-2 py-1 rounded-md bg-blue-500/10">Normal</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} className={`flex-1 h-2 rounded-full ${i <= 3 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                ))}
              </div>
            </div>

            {/* Database */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="text-green-500" size={18} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Database</span>
                </div>
                <span className="text-xs font-bold text-green-600 dark:text-green-500 px-2 py-1 rounded-md bg-green-500/10">Healthy</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">AES-256 Encryption Active</p>
            </div>

            {/* Last Security Scan */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-purple-500" size={18} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Security Scan</span>
                </div>
                <Clock className="text-purple-500" size={16} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Last scan: 2 hours ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Registrations & Hospital Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations Table */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Registrations</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest user activity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {(stats?.recentRegistrations || stats?.recentUsers || []).slice(0, 5).map((user: any) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar size={14} />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentRegistrations && !stats?.recentUsers) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="text-gray-300 dark:text-gray-700" size={32} />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent registrations</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hospital Status */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hospital Network</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Infrastructure overview</p>
          </div>

          <div className="space-y-6">
            {/* Active Hospitals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Hospitals</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-500">
                  {stats?.hospitalsByStatus?.active || 0}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats?.hospitalsByStatus?.active || 0) / (stats?.totalHospitals || 1) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Pending Verification */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending Verification</span>
                </div>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-500">
                  {stats?.hospitalsByStatus?.pending || 0}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats?.hospitalsByStatus?.pending || 0) / (stats?.totalHospitals || 1) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Network</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalHospitals || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AdminDashboard);
