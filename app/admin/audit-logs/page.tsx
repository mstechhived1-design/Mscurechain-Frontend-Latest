"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  User, 
  Hospital as HospitalIcon, 
  LogIn,
  LogOut,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";
import { adminService } from "@/lib/integrations/services/admin.service";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useSSE } from "@/hooks/useSSE";

interface AuthLog {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    mobile: string;
    hospitals?: Array<{ _id: string; name: string }>;
  };
  role: string;
  hospital?: {
    _id: string;
    name: string;
  };
  ipAddress: string;
  userAgent: string;
  loginAt: string;
  logoutAt?: string;
  duration?: string;
  status: string;
  sessionId: string;
  allSessions?: AuthLog[];
  totalSessions?: number;
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    role: "",
    status: "",
    hospital: "",
  });
  const [dynamicFilters, setDynamicFilters] = useState<{ 
    roles: string[]; 
    hospitals: Array<{ _id: string; name: string }> 
  }>({ roles: [], hospitals: [] });
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchFilters = useCallback(async () => {
    try {
      const response = await adminService.getAuthLogFiltersClient();
      if (response.success) {
        setDynamicFilters(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getAuthLogsClient({
        page,
        limit: 20,
        grouped: true,
        ...filters
      });
      if (response.success) {
        setLogs(response.data);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useSSE('system', (payload) => {
    if (payload.resourceType === 'AuthLog') {
      fetchLogs();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200";
      case "success": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200";
      case "completed": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200";
      case "expired": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200";
    }
  };

  const formatDuration = (duration?: string) => {
    return duration || "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg lg:text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <ShieldCheck className="text-blue-600 shrink-0" /> <span className="truncate">System Audit Logs</span>
        </h1>
        <button onClick={() => fetchLogs()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400">
          <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters: Responsive specialized layout */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-3">
        
        {/* Search: Full width on mobile, Flex-1 on desktop */}
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-blue-500/10 text-gray-900 dark:text-white transition-all text-sm"
          />
        </div>

        {/* Hospital: Full width on mobile, constrained on desktop */}
        <div className="w-full lg:w-[220px]">
          <select 
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 outline-none text-sm text-gray-700 dark:text-gray-300 capitalize cursor-pointer hover:bg-white dark:hover:bg-gray-900 transition-all font-medium"
            value={filters.hospital}
            onChange={(e) => setFilters(f => ({ ...f, hospital: e.target.value }))}
          >
            <option value="">All Hospitals</option>
            {dynamicFilters.hospitals.map(h => (
              <option key={h._id} value={h._id}>{h.name}</option>
            ))}
          </select>
        </div>

        {/* Roles & Status: Shared Grid on Mobile, separate on Desktop */}
        <div className="grid grid-cols-2 gap-4 lg:flex lg:gap-3 lg:items-center">
          <div className="w-full lg:w-[160px]">
            <select 
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 outline-none text-sm text-gray-700 dark:text-gray-300 capitalize cursor-pointer hover:bg-white dark:hover:bg-gray-900 transition-all font-medium"
              value={filters.role}
              onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
            >
              <option value="">All Roles</option>
              {dynamicFilters.roles.map(role => (
                <option key={role} value={role}>{role.replace(/-/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-[160px]">
            <select 
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 outline-none text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-white dark:hover:bg-gray-900 transition-all font-medium"
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="success">Success</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Container - REAL TABLE FOR PERFECT DYNAMIC ALIGNMENT */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">User</th>
                <th className="p-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Hospital</th>
                <th className="p-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Session</th>
                <th className="p-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap text-center font-mono">Duration</th>
                <th className="p-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap border-x border-gray-200 dark:border-gray-700/50 text-center w-[40%]">Context (IP & User Agent)</th>
                <th className="p-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-10 bg-gray-50/10 dark:bg-gray-900/5"></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">No logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log._id}>
                    <tr 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer ${expandedRows[log._id] ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      onClick={() => toggleRow(log._id)}
                    >
                      {/* User */}
                      <td className="p-4 pr-8">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200 dark:border-blue-800">
                            <User size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{log.user?.name || "Unknown"}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{log.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Hospital */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 whitespace-nowrap">
                          <HospitalIcon size={12} className="text-blue-500/60 shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">{log.hospital?.name || "Global Admin"}</span>
                        </div>
                      </td>

                      {/* Session */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-black text-gray-900 dark:text-gray-300 flex items-center gap-1.5 whitespace-nowrap">
                            <LogIn size={11} className="text-blue-500" /> {format(new Date(log.loginAt), "MMM dd, HH:mm")}
                          </span>
                          {!log.logoutAt ? (
                            <span className="text-[8px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Active</span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">{format(new Date(log.logoutAt), "HH:mm")}</span>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="p-4 text-center font-mono text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{formatDuration(log.duration)}</td>

                      {/* Context - REDUCED & CONSTRAINED */}
                      <td className="p-4 px-6 border-x border-gray-100 dark:border-gray-700/50 max-w-[400px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold font-mono"><Monitor size={11} className="opacity-50" /> {log.ipAddress || "0.0.0.0"}</div>
                          <div className="text-[10px] text-gray-400 font-mono overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 bg-gray-50 dark:bg-gray-900/30 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                            {log.userAgent}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {(() => {
                            const isCurrentlyActive = !log.logoutAt;
                            const displayStatus = isCurrentlyActive ? "active" : log.status;
                            return (
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-xs ${getStatusColor(displayStatus)} whitespace-nowrap`}>
                                {displayStatus}
                              </span>
                            );
                          })()}
                          <div className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all shrink-0">
                            {expandedRows[log._id] ? <ChevronUp size={16} className="text-blue-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded History */}
                    {expandedRows[log._id] && log.allSessions && (
                      <tr>
                        <td colSpan={6} className="p-6 pt-2 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3 mb-4 pl-4">
                            <Clock size={14} className="text-blue-500" />
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Session History Archive</h4>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                          </div>
                          <div className="space-y-3 pl-4">
                            {log.allSessions.map((session) => (
                              <div key={session._id} className="grid grid-cols-[100px_130px_130px_100px_1fr_120px] gap-4 items-center bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs hover:border-blue-200 transition-all">
                                <div><p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">ID</p><p className="font-mono text-[9px] text-gray-500 font-bold truncate">{session.sessionId || session._id.slice(-8)}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Login</p><p className="text-blue-600 font-black text-[10px]">{format(new Date(session.loginAt), "MMM dd, HH:mm")}</p></div>
                                <div><p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Logout</p><p className="text-gray-500 text-[10px] font-bold">{session.logoutAt ? format(new Date(session.logoutAt), "HH:mm") : <span className="text-emerald-500 font-black">ACTIVE</span>}</p></div>
                                <div className="text-center"><p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Stay</p><p className="text-gray-700 dark:text-gray-300 text-[10px] font-black font-mono">{formatDuration(session.duration)}</p></div>
                                <div className="px-4 border-x border-gray-100 dark:border-gray-800 overflow-hidden"><p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Meta</p><div className="text-[9px] text-gray-400 font-mono overflow-x-auto whitespace-nowrap">{session.userAgent}</div></div>
                                <div className="flex justify-end pr-2">
                                  {(() => {
                                    const isCurrentlyActive = !session.logoutAt;
                                    const displayStatus = isCurrentlyActive ? "active" : session.status;
                                    return (
                                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-xs ${getStatusColor(displayStatus)}`}>
                                        {displayStatus}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">Page <span className="text-gray-900 dark:text-white text-xs">{page}</span> of <span className="text-gray-900 dark:text-white text-xs">{totalPages}</span></p>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 transition-all shadow-xs"><ChevronLeft size={18} className="text-gray-600" /></button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 transition-all shadow-xs"><ChevronRight size={18} className="text-gray-600" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditLogs;