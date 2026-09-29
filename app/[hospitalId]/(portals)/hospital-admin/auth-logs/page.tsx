"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  RotateCcw, 
  Search, 
  User,  
  Monitor, 
  LogIn,
  LogOut,
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface AuthLog {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    mobile: string;
  };
  role: string;
  ipAddress: string;
  userAgent: string;
  loginAt: string;
  logoutAt?: string;
  duration?: number;
  status: string;
  sessionId: string;
}

function HospitalAuthLogs() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    role: "",
    status: "",
  });
  const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);

  const fetchFilters = async () => {
    try {
      const response = await hospitalAdminService.getAuthLogFilters();
      if (response.success) {
        setDynamicRoles(response.data.roles);
      }
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  };

  const fetchLogs = async (currentPage = pagination.page) => {
    setLoading(true);
    try {
      const response = await hospitalAdminService.getAuthLogs({
        page: currentPage,
        limit: 15,
        ...filters
      });
      if (response.success) {
        setLogs(response.data);
        setPagination({
          page: response.pagination.page,
          totalPages: response.pagination.pages
        });
      }
    } catch (error) {
      console.error("Failed to fetch hospital auth logs:", error);
      toast.error("Error loading security logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  // ✅ REAL-TIME UPDATES: Listen for system events (AuthLog changes) across the hospital
  useSSE('system', (payload) => {
    if (payload.resourceType === 'AuthLog') {
      console.log("[SSE] AuthLog update detected, refetching...");
      fetchLogs();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "completed": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "expired": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
            <ShieldCheck className="text-emerald-500" size={28} />
            Security & Audit Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all authentication sessions within your hospital</p>
        </div>
        <button 
          onClick={() => fetchLogs()}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
        >
          <RotateCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search user ID..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none" />
        </div>
        <select 
          value={filters.role}
          onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-gray-700 dark:text-gray-300 capitalize"
        >
          <option value="">All Roles</option>
          {dynamicRoles.map(role => (
            <option key={role} value={role}>{role.replace(/-/g, ' ')}</option>
          ))}
        </select>
        <select 
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none text-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Sessions</option>
          <option value="completed">Finished</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10">
                <th className="p-4 text-xs font-semibold uppercase text-gray-400">User Details</th>
                <th className="p-4 text-xs font-semibold uppercase text-gray-400">Activity</th>
                <th className="p-4 text-xs font-semibold uppercase text-gray-400">Duration</th>
                <th className="p-4 text-xs font-semibold uppercase text-gray-400">Platform</th>
                <th className="p-4 text-xs font-semibold uppercase text-gray-400 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-10"></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-500">No security logs found for this period.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                          <User size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{log.user?.name || "N/A"}</h4>
                          <h5 className="text-[10px] uppercase font-bold text-gray-400">{log.role}</h5>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium">
                          <LogIn size={13} /> 
                          {format(new Date(log.loginAt), "dd MMM, HH:mm")}
                        </span>
                        {log.logoutAt ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium opacity-80">
                            <LogOut size={13} /> 
                            {format(new Date(log.logoutAt), "dd MMM, HH:mm")}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-500 font-bold ml-5 uppercase">Active</span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono tracking-tighter opacity-70 break-all">SID: {log.sessionId}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDuration(log.duration)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <Monitor size={12} className="text-gray-400" />
                          {log.ipAddress}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-relaxed italic">
                          {log.userAgent}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-700 bg-gray-50/20 dark:bg-gray-900/10">
          <span className="text-sm text-gray-500">Showing page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button 
              disabled={pagination.page === 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HospitalAuthLogs;
