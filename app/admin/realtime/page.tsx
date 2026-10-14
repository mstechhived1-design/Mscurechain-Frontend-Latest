"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { adminService } from "@/lib/integrations";
import { useAuthStore } from "@/stores/authStore";
import {
  Activity,
  Server,
  Database,
  Cloud,
  Zap,
  RefreshCw,
  Clock,
  AlertTriangle,
  Radio,
  Wifi,
  HardDrive,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Layers,
  PhoneCall,
  Flame,
  Globe,
  Mail
} from "lucide-react";

// Load Chart dynamically to avoid SSR hydration issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RealtimeTelemetryPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"network" | "storage" | "whatsapp">("network");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Tab 1: Pulse Metrics & Traffic Data
  const [pulseData, setPulseData] = useState<{
    pulse: { rpm: number; avgLatency: number; apiErrors: number; liveConnections: number };
    trafficHistory: { timestamp: string; rpm: number }[];
    topHospitals: { name: string; rpm: number; status: string }[];
    hospitalMatrix: any[];
  } | null>(null);

  // Tab 2: Storage & External Health Data
  const [infraData, setInfraData] = useState<{
    mongodb: any;
    cloudinary: any;
    redis: any;
    email?: any;
    dailyTransfer: any;
    revenueVelocity: any;
  } | null>(null);

  // Tab 3: WhatsApp Matrix Data
  const [whatsappData, setWhatsappData] = useState<{
    summary: { activeNodes: number; totalNodes: number; disconnectedNodes: number; globalMessagesToday: number };
    matrix: any[];
  } | null>(null);

  // Selected hospital for WhatsApp department routing inspection
  const [expandedWhatsAppRow, setExpandedWhatsAppRow] = useState<string | null>(null);

  const fetchPulseData = useCallback(async () => {
    try {
      const res = await adminService.getRealtimePulseClient();
      if (res && res.success) {
        setPulseData(res);
      }
    } catch (err: any) {
      console.warn("Pulse fetch error:", err);
    }
  }, []);

  const fetchInfraData = useCallback(async () => {
    try {
      const res = await adminService.getRealtimeInfrastructureClient();
      if (res && res.success) {
        setInfraData(res);
      }
    } catch (err: any) {
      console.warn("Infra fetch error:", err);
    }
  }, []);

  const fetchWhatsAppMatrix = useCallback(async () => {
    try {
      const res = await adminService.getRealtimeWhatsAppClient();
      if (res && res.success) {
        setWhatsappData(res);
      }
    } catch (err: any) {
      console.warn("WhatsApp matrix fetch error:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchPulseData(), fetchInfraData(), fetchWhatsAppMatrix()]);
    setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setIsRefreshing(false);
  }, [fetchPulseData, fetchInfraData, fetchWhatsAppMatrix]);

  // Initial fetch and 5-second recurring polling loop
  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
      const interval = setInterval(() => {
        fetchPulseData();
        // Storage & WhatsApp refresh every 15s to keep overhead minimal
        if (Date.now() % 15000 < 5000) {
          fetchInfraData();
          fetchWhatsAppMatrix();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshAll, fetchPulseData, fetchInfraData, fetchWhatsAppMatrix]);

  // Helper to format timestamp into 12-hour IST format (e.g., 06:39:19 pm)
  const format12HourIST = (timeStr: string) => {
    if (!timeStr) return "";
    if (/am|pm/i.test(timeStr)) return timeStr.toLowerCase();
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const seconds = parts[2] ? parts[2].split(" ")[0] : "00";
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12;
      const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
    }
    return timeStr;
  };

  // Chart configuration for Network Traffic Area Chart
  const trafficChartSeries = [
    {
      name: "Requests / Min",
      data: pulseData?.trafficHistory?.map((h) => h.rpm) || [0],
    },
  ];

  const trafficChartOptions: any = {
    chart: {
      type: "area",
      height: 220,
      toolbar: { show: false },
      sparkline: { enabled: false },
      animations: { enabled: true, easing: "linear", dynamicAnimation: { speed: 1000 } },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2.5, colors: ["#2563eb"] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 95, 100],
        colorStops: [
          { offset: 0, color: "#3b82f6", opacity: 0.4 },
          { offset: 100, color: "#3b82f6", opacity: 0.0 },
        ],
      },
    },
    xaxis: {
      categories: pulseData?.trafficHistory?.map((h) => format12HourIST(h.timestamp)) || [""],
      labels: { style: { colors: "#94a3b8", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#94a3b8", fontSize: "10px" } },
      min: 0,
    },
    colors: ["#2563eb"],
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    tooltip: { theme: "light" },
  };

  // Chart configuration for Top Hospitals Bar Chart
  const topHospitalsCategories = pulseData?.topHospitals?.map((h) => h.name) || [];
  const topHospitalsSeries = [
    {
      name: "RPM",
      data: pulseData?.topHospitals?.map((h) => h.rpm) || [],
    },
  ];

  const topHospitalsOptions: any = {
    chart: {
      type: "bar",
      height: 220,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "50%",
        distributed: true,
      },
    },
    colors: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"],
    dataLabels: { enabled: true, style: { fontSize: "10px", colors: ["#fff"] } },
    xaxis: {
      categories: topHospitalsCategories,
      labels: { style: { colors: "#94a3b8", fontSize: "10px" } },
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 } },
    },
    grid: { borderColor: "#f1f5f9" },
    legend: { show: false },
    tooltip: { theme: "light" },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header & Telemetry Mode Bar ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Real-Time Telemetry & SaaS Health
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  LIVE (5s)
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Monitoring Atlas Free Tier, Cloudinary, Redis cache, Gmail SMTP engine, live network throughput, and WhatsApp communication matrix.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
              <Clock size={12} /> {lastUpdated}
            </span>
          )}
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
            Sync Now
          </button>
        </div>
      </div>

      {/* ─── Sub-Tab Navigation Bar ───────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2">
        <button
          onClick={() => setActiveTab("network")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "network"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Radio size={16} />
          Network & Live Traffic
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "storage"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Database size={16} />
          Storage & External Services
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "whatsapp"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <MessageSquare size={16} />
          WhatsApp Communication Matrix
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: NETWORK & LIVE TRAFFIC
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "network" && (
        <div className="space-y-6">
          {/* 4 Pulse KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Global RPM */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Global RPM</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {pulseData?.pulse?.rpm ?? 0}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <ArrowUpRight size={12} /> Network requests / min
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <Activity size={24} />
              </div>
            </div>

            {/* Avg Latency */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Latency</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {pulseData?.pulse?.avgLatency ?? 0} <span className="text-sm font-semibold text-gray-400">ms</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock size={12} /> Server response duration
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Zap size={24} />
              </div>
            </div>

            {/* API Errors */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">API Errors</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {pulseData?.pulse?.apiErrors ?? 0}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">HTTP 4xx / 5xx (last 60s)</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            </div>

            {/* Live Connections */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Sockets</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {pulseData?.pulse?.liveConnections ?? 0}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Active SSE client sessions</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Wifi size={24} />
              </div>
            </div>
          </div>

          {/* 2 Telemetry Charts (Side-by-side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Time Series Area Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Network Traffic Flow (RPM)</h3>
                  <p className="text-xs text-gray-400">Sliding real-time traffic pulse</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-xl">
                  {pulseData?.pulse?.rpm || 0} req/min
                </span>
              </div>
              <div className="h-[220px]">
                {pulseData?.trafficHistory && <Chart options={trafficChartOptions} series={trafficChartSeries} type="area" height={220} />}
              </div>
            </div>

            {/* Chart 2: Top Active Hospitals */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Active Hospitals (by RPM)</h3>
                  <p className="text-xs text-gray-400">Throughput comparison</p>
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-xl">
                  Active Nodes
                </span>
              </div>
              <div className="h-[220px]">
                {pulseData?.topHospitals && <Chart options={topHospitalsOptions} series={topHospitalsSeries} type="bar" height={220} />}
              </div>
            </div>
          </div>

          {/* Hospital Live Activity Matrix Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Hospital Live Matrix</h3>
                <p className="text-xs text-gray-400">Individual hospital throughput, daily transfer and ping telemetry</p>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-xl">
                {pulseData?.hospitalMatrix?.length || 0} Nodes Tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Hospital / Node</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4">Live RPM</th>
                    <th className="py-3 px-4">Daily Transfer (In/Out)</th>
                    <th className="py-3 px-4">Last Activity Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {pulseData?.hospitalMatrix?.map((h: any, idx: number) => {
                    const isOnline = h.status === "Active Now";
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Building2 size={14} className="text-blue-500" />
                          {h.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                              isOnline
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {h.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {h.rpm} req/m
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 font-mono">
                          ↓ {(h.dailyBytesIn / (1024 * 1024)).toFixed(2)} MB / ↑ {(h.dailyBytesOut / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono">
                          {h.lastPing > 0 ? new Date(h.lastPing).toLocaleTimeString() : "Never"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: STORAGE & EXTERNAL SERVICES HEALTH
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "storage" && (
        <div className="space-y-6">
          {/* External Services Quartet */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. MongoDB Atlas Free Tier Quota */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Database size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">MongoDB Single Cluster</h4>
                      <p className="text-[10px] text-gray-400">Atlas Free Tier (M0 Quota)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {infraData?.mongodb?.status || "Healthy"}
                  </span>
                </div>

                {/* Storage Progress Bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Occupied Storage:</span>
                    <span className="text-gray-900 dark:text-white">
                      {infraData?.mongodb?.formattedUsed || "0 MB"} / 512 MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, infraData?.mongodb?.usedPercentage || 2)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 text-right">
                    Remaining: <span className="font-semibold text-gray-700 dark:text-gray-300">{infraData?.mongodb?.formattedRemaining || "512 MB"}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Collections</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {infraData?.mongodb?.collectionsCount || 0}{" "}
                    <span className="text-xs font-semibold text-gray-400">/ {infraData?.mongodb?.collectionsLimit || 500}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Total Documents</p>
                  <p className="font-bold text-gray-900 dark:text-white">{infraData?.mongodb?.documentsCount?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>

            {/* 2. Cloudinary Media Storage */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Cloud size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Cloudinary Storage</h4>
                      <p className="text-[10px] text-gray-400">{infraData?.cloudinary?.plan || "Free"} Plan</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      infraData?.cloudinary?.status?.includes("Healthy") || infraData?.cloudinary?.status === "Connected"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {infraData?.cloudinary?.status || "Active"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Storage Used:</span>
                    <span className="text-gray-900 dark:text-white">
                      {infraData?.cloudinary?.formattedUsed || "0 B"} / {infraData?.cloudinary?.formattedQuota || "25 GB"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full w-2" />
                  </div>
                  <p className="text-[11px] text-gray-400 text-right">
                    Remaining: <span className="font-semibold text-gray-700 dark:text-gray-300">{infraData?.cloudinary?.formattedRemaining || "25 GB"}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Live Assets</p>
                  <p className="font-bold text-gray-900 dark:text-white">{infraData?.cloudinary?.liveImages || 0} items</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Bandwidth</p>
                  <p className="font-bold text-gray-900 dark:text-white">{infraData?.cloudinary?.bandwidthUsed || "0 B"}</p>
                </div>
              </div>
            </div>

            {/* 3. Redis In-Memory Cache */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Redis Cache Engine</h4>
                      <p className="text-[10px] text-gray-400">{infraData?.redis?.cacheType || "In-Memory"}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      infraData?.redis?.isAvailable
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-gray-100 text-gray-700 border border-gray-300"
                    }`}
                  >
                    {infraData?.redis?.status || "In-Memory"}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Connection Endpoint</p>
                  <p className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">
                    {infraData?.redis?.connectionUrl || "redis://localhost:6379"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Ping Latency</p>
                  <p className="font-bold text-gray-900 dark:text-white">{infraData?.redis?.latencyMs || 1} ms</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Health State</p>
                  <p className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Active
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Email Gateway (Gmail SMTP) */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Email Gateway</h4>
                      <p className="text-[10px] text-gray-400">Gmail SMTP Service</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      infraData?.email?.isConfigured || infraData?.email?.status?.includes("Connected")
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-700 border border-gray-300"
                    }`}
                  >
                    {infraData?.email?.status || "Connected & Ready"}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Authorized Sender</p>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck size={11} /> TLS / SSL
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 truncate mt-1">
                    {infraData?.email?.senderEmail || "mscurechain@gmail.com"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Port / Protocol</p>
                  <p className="font-bold text-gray-900 dark:text-white">Port {infraData?.email?.port || 465} (SSL)</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Auth Method</p>
                  <p className="font-bold text-gray-900 dark:text-white">App Key (2FA)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Performance & Revenue Velocity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Data Transfer */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Data Transfer (Today)</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                  {infraData?.dailyTransfer?.formattedTotal || "0 B"}
                </h3>
                <div className="flex gap-4 text-xs font-mono text-gray-500 mt-2">
                  <span>↓ Inbound: <strong>{infraData?.dailyTransfer?.formattedIn || "0 B"}</strong></span>
                  <span>↑ Outbound: <strong>{infraData?.dailyTransfer?.formattedOut || "0 B"}</strong></span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <HardDrive size={28} />
              </div>
            </div>

            {/* Live Revenue Velocity */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Revenue Velocity (Today)</p>
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {infraData?.revenueVelocity?.formattedRevenue || "₹0"}
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  {infraData?.revenueVelocity?.paidTransactions || 0} paid transactions completed as of {infraData?.revenueVelocity?.asOf}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Flame size={28} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: WHATSAPP COMMUNICATION MATRIX
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Active Nodes</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {whatsappData?.summary?.activeNodes || 0} / {whatsappData?.summary?.totalNodes || 0}
                </h3>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Connected WhatsApp instances</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Global Messages Today</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {whatsappData?.summary?.globalMessagesToday || 0}
                </h3>
                <p className="text-xs text-blue-600 font-semibold mt-1">Total messages dispatched</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Disconnected Nodes</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {whatsappData?.summary?.disconnectedNodes || 0}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Pending QR scan or unlinked</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                <XCircle size={24} />
              </div>
            </div>
          </div>

          {/* Connection Matrix Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Live WhatsApp Connection Matrix</h3>
                <p className="text-xs text-gray-400">Device binding, phone number, messages sent, and department routing</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Hospital Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Phone Number Linked</th>
                    <th className="py-3 px-4">Device Name</th>
                    <th className="py-3 px-4">Msgs Today</th>
                    <th className="py-3 px-4">Linked Timestamp</th>
                    <th className="py-3 px-4 text-right">Department Routing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {whatsappData?.matrix?.map((node: any, idx: number) => {
                    const isConnected = node.status === "CONNECTED";
                    const isExpanded = expandedWhatsAppRow === node.hospitalId;

                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Building2 size={14} className="text-emerald-500" />
                            {node.hospitalName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                                isConnected
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {node.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-700 dark:text-gray-300">
                            {node.connectedNumber ? `+${node.connectedNumber.replace(/^\+/, "")}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                            {node.deviceName || "Unbound"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-blue-600">
                            {node.messagesToday}
                          </td>
                          <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                            {node.linkedAt ? new Date(node.linkedAt).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setExpandedWhatsAppRow(isExpanded ? null : node.hospitalId)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 inline-flex items-center gap-1 transition-all"
                            >
                              Departments {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </td>
                        </tr>

                        {/* Accordion Sub-Table for Department Routing */}
                        {isExpanded && (
                          <tr className="bg-gray-50/80 dark:bg-gray-800/80">
                            <td colSpan={7} className="p-4">
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                  <PhoneCall size={13} className="text-blue-500" />
                                  Department Notification Routing Matrix: {node.hospitalName}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                  {["pharma", "lab", "frontdesk", "doctor"].map((deptKey) => {
                                    const dept = node.departmentRouting?.[deptKey];
                                    const isDeptEnabled = dept?.enabled;
                                    return (
                                      <div
                                        key={deptKey}
                                        className={`p-3 rounded-xl border text-xs ${
                                          isDeptEnabled
                                            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                            : "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-850"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-bold capitalize text-gray-800 dark:text-gray-200">
                                            {dept?.name || deptKey}
                                          </span>
                                          <span
                                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                              isDeptEnabled ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
                                            }`}
                                          >
                                            {isDeptEnabled ? "Active" : "Disabled"}
                                          </span>
                                        </div>
                                        <p className="text-[11px] font-mono text-gray-600 dark:text-gray-400 mt-1">
                                          {dept?.phoneNumber ? `📞 ${dept.phoneNumber}` : "No number assigned"}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
