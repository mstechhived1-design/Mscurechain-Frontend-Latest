"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  ClipboardList,
  Wallet,
  Activity,
  RefreshCw,
  ArrowRight,
  ArrowRightCircle,
  FlaskConical,
  CreditCard,
  Smartphone,
  Banknote,
  IndianRupee,
  Beaker,
  Sparkles
} from "lucide-react";
import {
  LabDashboardService,
  LabDashboardStats,
} from "@/lib/integrations/services/labDashboard.service";
import { LabSampleService } from "@/lib/integrations/services/labSample.service";
import { LabSample } from "@/lib/integrations/types/labSample";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { clearApiCache } from "@/lib/integrations/api/apiClient";
import { toast } from "react-hot-toast";

// Clean Skeleton
const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-28 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse" />
    </div>
  </div>
);

const rangeLabels: Record<string, string> = {
  today: "Today",
  "7days": "Week",
  "1month": "Month",
  custom: "Custom",
};

function LabDashboard() {
  const [range, setRange] = useState("today");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [activeTests, setActiveTests] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const { user } = useAuthStore();

  // Billing Type Filter state
  const [typeFilter, setTypeFilter] = useState<'all' | 'opd' | 'ipd' | 'lab'>('all');

  // Helper to identify a sample's patient type
  const getSamplePatientType = (sample: LabSample): 'opd' | 'ipd' | 'lab' => {
      if (sample.patientDetails?.patientType) return sample.patientDetails.patientType.toLowerCase() as 'opd' | 'ipd' | 'lab';
      if (sample.patientDetails?.bedInfo) return 'ipd';
      if (sample.patientDetails?.originalPatientName) return 'lab';
      
      const nameLower = (sample.patientDetails?.name || '').toLowerCase();
      if (nameLower.includes('lab') || nameLower.includes('diagnostic') || nameLower.includes('center') || nameLower.includes('hospital')) {
          return 'lab';
      }

      if (sample.isWalkIn) return 'opd';
      return 'opd';
  };

  useEffect(() => {
    if (range === "custom") {
      if (!startDate || !endDate) return;
      if (startDate > endDate) {
        toast.error("Start Date cannot be after End Date");
        return;
      }
    }
    fetchStats();

    // 2. Listen for socket-triggered events
    const handleRefresh = () => fetchStats(true, true);
    window.addEventListener("refresh-lab-data", handleRefresh);

    // 3. Socket.IO Real-time Updates
    const hospitalId = (user as any)?.hospital;
    if (hospitalId) {
      import('@/lib/integrations/api/socket').then(({ subscribeToSocket }) => {
        subscribeToSocket('new_lab_order', () => {
          console.log("🔔 New Lab Order Received via Socket");
          fetchStats(true, true);
        });
      });
    }

    // 4. Poll as a fallback every 30 seconds
    const pollInterval = setInterval(() => {
      console.log('🔄 Periodic Sync: Fetching fresh dashboard data');
      fetchStats(true, true);
    }, 30000);

    return () => {
      window.removeEventListener("refresh-lab-data", handleRefresh);
      clearInterval(pollInterval);
      if (hospitalId) {
        import('@/lib/integrations/api/socket').then(({ unsubscribeFromSocket }) => {
          unsubscribeFromSocket('new_lab_order', handleRefresh);
        });
      }
    };
  }, [range, user, startDate, endDate]);

  const fetchStats = async (silent = false, skipCache = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsData, samplesData] = await Promise.all([
        LabDashboardService.getStats(
          range,
          skipCache,
          range === "custom" ? startDate : undefined,
          range === "custom" ? endDate : undefined
        ),
        LabSampleService.getSamples("Pending", skipCache),
      ]);
      setStats(statsData);
      setActiveTests(samplesData.slice(0, 5));
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    colorClass,
    iconColorClass,
    bgClass
  }: any) => {
    return (
      <div className={`relative overflow-hidden p-5 xl:p-6 rounded-[24px] border ${colorClass} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group`}>
        {/* Animated background glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl -mr-10 -mt-10 rounded-full transition-all duration-500 group-hover:scale-150 ${bgClass}`} />
        
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl shadow-sm ${iconColorClass}`}>
            <Icon className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className={`p-1.5 rounded-full ${iconColorClass} bg-opacity-20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity`}>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
        <div className="relative z-10">
          <h3 className="text-3xl xl:text-4xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
            {value}
          </h3>
          <p className="text-xs xl:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            {title}
            {title.includes("Revenue") && <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />}
          </p>
        </div>
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="max-w-full mx-auto p-6 space-y-6 bg-slate-50 dark:bg-gray-900 min-h-screen">
        <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Soft gradient background */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-transparent dark:from-indigo-900/10 dark:via-purple-900/5 pointer-events-none" />
        
        {/* Heading */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
             <Activity className="w-6 h-6 md:w-8 md:h-8 animate-pulse" />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-gray-900 rounded-full animate-ping" />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
              Hello <span className="text-indigo-600 dark:text-indigo-400">{user?.name || "User"}</span>, here's what's happening today.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between xl:justify-end gap-3 w-full xl:w-auto">
          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">End</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                />
              </div>
              {startDate > endDate && (
                <span className="text-xs text-rose-600 font-bold px-3 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900">
                  Invalid Range
                </span>
              )}
            </div>
          )}

          <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
            {Object.keys(rangeLabels).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-xl ${
                  range === r
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md shadow-gray-200/50 dark:shadow-none ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Core Metrics Grid - Vibrant Light Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${stats?.revenue.toLocaleString() || 0}`}
          icon={TrendingUp}
          colorClass="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          iconColorClass="bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 dark:from-indigo-900/50 dark:to-indigo-900/20 dark:text-indigo-400"
          bgClass="bg-indigo-500"
        />
        <StatCard
          title="Total Patients"
          value={stats?.patients || 0}
          icon={Users}
          colorClass="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          iconColorClass="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 dark:from-blue-900/50 dark:to-blue-900/20 dark:text-blue-400"
          bgClass="bg-blue-500"
        />
        <StatCard
          title="New Tests"
          value={stats?.totalTests || 0}
          icon={FlaskConical}
          colorClass="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          iconColorClass="bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 dark:from-emerald-900/50 dark:to-emerald-900/20 dark:text-emerald-400"
          bgClass="bg-emerald-500"
        />
        <StatCard
          title="Pending Reports"
          value={stats?.pendingSamples || 0}
          icon={ClipboardList}
          colorClass="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
          iconColorClass="bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 dark:from-orange-900/50 dark:to-orange-900/20 dark:text-orange-400"
          bgClass="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 h-full">
        {/* Pending Lab Orders Table - Maximized Height */}
        <div className="xl:col-span-2 flex flex-col h-full">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-none flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 gap-4 bg-gray-50/50 dark:bg-gray-800/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                  <Beaker className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-base md:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  Recent Lab Orders
                </h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/lab/samples"
                  className="group flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all"
                >
                  View All Orders
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 no-scrollbar">
              {activeTests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">
                    No pending orders right now.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Sample
                      </th>
                      <th className="px-5 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Patient
                      </th>
                      <th className="px-5 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Tests
                      </th>
                      <th className="px-5 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {activeTests
                      .filter(test => typeFilter === 'all' || getSamplePatientType(test) === typeFilter)
                      .map((test) => (
                      <tr
                        key={test._id}
                        className="hover:bg-indigo-50/30 dark:hover:bg-gray-800/50 transition-colors group relative"
                      >
                        <td className="px-5 md:px-6 py-4">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="font-black text-sm md:text-base text-gray-900 dark:text-white">
                            #{test.sampleId}
                          </span>
                          <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                            {new Date(test.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-5 md:px-6 py-4">
                          <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {getSamplePatientType(test) === 'lab' ? (
                              <>
                                <span className="font-black text-gray-900 dark:text-white">
                                  {test.patientDetails.name}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md uppercase tracking-wider">
                                  {test.patientDetails.refDoctor || 'Lab'}
                                </span>
                              </>
                            ) : test.patientDetails.originalPatientName ? (
                              <>
                                <span className="font-black text-gray-900 dark:text-white">
                                  {test.patientDetails.originalPatientName}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md uppercase tracking-wider">
                                  {test.patientDetails.name}
                                </span>
                              </>
                            ) : (
                              test.patientDetails.name
                            )}
                            {test.priority && test.priority !== 'routine' && (
                              <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                {test.priority}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {test.patientDetails.age}Y •{" "}
                            {test.patientDetails.gender}
                          </div>
                          {test.clinicalAnnotations && (
                            <div className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-1.5 rounded-lg mt-2 font-bold line-clamp-1 border border-amber-100 dark:border-amber-900/50">
                              {test.clinicalAnnotations}
                            </div>
                          )}
                        </td>
                        <td className="px-5 md:px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {test.tests.slice(0, 2).map((t, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50"
                              >
                                {t.testName}
                              </span>
                            ))}
                            {test.tests.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500">
                                +{test.tests.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 md:px-6 py-4 text-right">
                          <button
                            onClick={() => startNavigation(() => router.push("/lab/samples"))}
                            disabled={isNavigating}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all transform group-hover:-translate-y-0.5 ${isNavigating ? 'opacity-70' : ''}`}
                          >
                            Process
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financials */}
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 flex flex-col gap-6 h-full relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full blur-3xl" />
            
            <div className="relative flex items-center justify-between z-10">
              <h3 className="font-black text-gray-900 dark:text-white text-lg">
                Revenue Sources
              </h3>
              <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-indigo-900/20 rounded-xl shadow-sm">
                <IndianRupee className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>

            <div className="relative space-y-6 flex-1 justify-center flex flex-col z-10">
              {[
                {
                  label: "Cash Collection",
                  value: stats?.paymentBreakdown.Cash || 0,
                  color: "bg-emerald-500",
                  bg: "bg-emerald-100",
                  icon: IndianRupee,
                  iconColor: "text-emerald-600"
                },
                {
                  label: "Card Transactions",
                  value: stats?.paymentBreakdown.Card || 0,
                  color: "bg-indigo-500",
                  bg: "bg-indigo-100",
                  icon: CreditCard,
                  iconColor: "text-indigo-600"
                },
                {
                  label: "UPI Payments",
                  value: stats?.paymentBreakdown.UPI || 0,
                  color: "bg-purple-500",
                  bg: "bg-purple-100",
                  icon: Smartphone,
                  iconColor: "text-purple-600"
                },
              ].map((item, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${item.bg} dark:bg-gray-800`}>
                         <item.icon className={`w-4 h-4 ${item.iconColor} dark:text-gray-300`} />
                      </div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {item.label}
                      </span>
                    </div>
                    <span className="font-black text-sm text-gray-900 dark:text-white">
                      ₹{item.value.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className={`h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden`}
                  >
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                      style={{
                        width: `${(item.value / (stats?.collections || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Total Collections
                  </p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    ₹{stats?.collections.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center border border-indigo-100/50 dark:border-indigo-800/50 shadow-sm">
                  <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LabDashboard);
