'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { toast } from 'react-hot-toast';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

function AttendanceOverview() {
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
  const { data: attendanceData, isLoading: loading, error } = useQuery({
    queryKey: ['hospital-admin-attendance-overview'],
    queryFn: async () => {
      const apiStartTime = performance.now();
      console.log(`[API] Starting attendance overview fetch`);
      try {
        const [statsResponse, recentResponse] = await Promise.all([
          hospitalAdminService.getAttendanceStats(),
          hospitalAdminService.getAttendance()
        ]);
        const apiEndTime = performance.now();
        console.log(`[API] Attendance overview fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
        return {
          stats: statsResponse.stats,
          recentAttendance: recentResponse.attendance || []
        };
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
        toast.error("Failed to load attendance overview");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const stats: any = attendanceData?.stats || null;
  const recentAttendance = attendanceData?.recentAttendance || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full spin"></div>
      </div>
    );
  }

  const chartData = stats?.trend || [
    { name: 'Mon', present: 0, late: 0 },
    { name: 'Tue', present: 0, late: 0 },
    { name: 'Wed', present: 0, late: 0 },
    { name: 'Thu', present: 0, late: 0 },
    { name: 'Fri', present: 0, late: 0 },
    { name: 'Sat', present: 0, late: 0 },
    { name: 'Sun', present: 0, late: 0 },
  ];

  const pieData = [
    { name: 'Present', value: stats?.today?.present || 0 },
    { name: 'On Leave', value: stats?.today?.onLeave || 0 },
    { name: 'Late', value: stats?.today?.late || 0 },
    { name: 'Absent', value: stats?.today?.absent || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="p-2 sm:p-4 md:p-6 xl:p-8 space-y-6 md:space-y-8 ">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Attendance Tracking</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-bold mt-1">Real-time overview of your hospital's workforce presence.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-2 px-4 md:px-6 py-2 bg-blue-600 text-white rounded-xl text-xs md:text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none">
            Update Shift
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110">
              <Users className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full uppercase">
              <ArrowUpRight className="w-3 h-3" /> 12%
            </span>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Staff Assets</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.totalStaff || 0}</h3>
            <span className="text-xs font-bold text-gray-400 uppercase">Personnel</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full uppercase">
              Live
            </span>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Present Today</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.today?.present || 0}</h3>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-tighter">Active duty</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:border-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110">
              <Clock className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full uppercase">
              Critical
            </span>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Late Arrivals</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.today?.late || 0}</h3>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-tighter">Delay detected</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-full uppercase">
              Avg
            </span>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance Rate</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.averageAttendance || 0}%</h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Month-to-date</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Weekly Trend Chart */}
        <div className="lg:col-span-1 xl:col-span-2 bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Weekly Presence Flux</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel availability analytics</p>
            </div>
            <select className="bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#4f46e5"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Distribution */}
        <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Presence Ratio</h3>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Daily status breakdown</p>

          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{stats?.today?.present || 0}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase">On Duty</span>
            </div>
          </div>

          <div className="space-y-3 mt-8">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                </div>
                <span className="text-xs font-black text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-2 md:p-4 md:p-8 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Recent Personnel Activity</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Live check-in/out stream</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-48 md:w-64"
              />
            </div>
            <button className="p-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-500 rounded-xl hover:text-blue-500">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/30">
                <th className="px-4 md:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Check In</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Check Out</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentAttendance
                .filter(record => {
                  const matchesStatus = record.status !== 'on-leave';
                  const name = (record.staff?.user?.name || '').toLowerCase();
                  const designation = (record.staff?.designation || '').toLowerCase();
                  const search = searchTerm.toLowerCase();

                  const matchesSearch = !searchTerm || name.includes(search) || designation.includes(search);

                  return matchesStatus && matchesSearch;
                })
                .map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 group">
                    <td className="px-4 md:px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs md:text-sm">
                          {record.staff?.user?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-black text-gray-900 dark:text-white leading-none">{record.staff?.user?.name}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase mt-1">{record.staff?.designation || 'Staff'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      <span className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase border ${record.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        record.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          record.status === 'absent' ? 'bg-red-50 text-red-700 border-red-100' :
                            record.status === 'on-leave' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              'bg-gray-50 text-gray-700 border-gray-100'
                        }`}>
                        {record.status === 'present' ? <CheckCircle2 className="w-3 h-3" /> :
                          record.status === 'late' ? <Clock className="w-3 h-3" /> :
                            record.status === 'on-leave' ? <Calendar className="w-3 h-3" /> :
                              <XCircle className="w-3 h-3" />}
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      {record.status !== 'on-leave' ? (
                        <div className="flex flex-col">
                          <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                          <span className="text-[9px] md:text-[10px] font-bold text-gray-400 mt-0.5">{record.checkIn?.method || 'Portal'}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      {record.status !== 'on-leave' ? (
                        <div className="flex flex-col">
                          <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                          <span className="text-[9px] md:text-[10px] font-bold text-gray-400 mt-0.5">{record.checkOut?.time ? 'Portal' : 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      <button className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl text-gray-400 hover:text-blue-500">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              {recentAttendance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 md:px-8 py-10 text-center">
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-bold italic">No recent activity detected.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(AttendanceOverview);
