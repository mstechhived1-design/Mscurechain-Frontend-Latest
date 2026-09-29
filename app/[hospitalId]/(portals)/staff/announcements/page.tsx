'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';
import { staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAnnouncements();
    // Enable real-time updates via polling (every 30 seconds)
    const interval = setInterval(loadAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await staffService.getAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-600 border-red-100 ring-red-500';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500';
      case 'low': return 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500';
      default: return 'bg-gray-50 text-gray-600 border-gray-100 ring-gray-500';
    }
  };

  const filteredAnnouncements = useMemo(() => {
    const raw = filter === 'all'
      ? announcements
      : announcements.filter(a => a.priority === filter);

    // Frontend Filter: Only show if 'all' or 'staff' is in targetRoles
    return raw.filter(a =>
      !a.targetRoles ||
      a.targetRoles.includes('all') ||
      a.targetRoles.includes('staff')
    );
  }, [announcements, filter]);

  // Pagination logic
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 sm:gap-2 px-1 sm:px-0">
        <div>
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 flex flex-col sm:flex-row sm:items-center gap-2 leading-none">
            Hospital Announcements
            {announcements.filter(a => a.priority === 'high').length > 0 && (
              <span className="w-fit flex items-center gap-1 bg-red-100 text-red-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle className="w-3 h-3" /> Urgent
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1 text-[11px] sm:text-sm font-bold">Stay updated with the latest news and guidelines.</p>
        </div>

      </div>

      {/* Featured / Important Section */}
      {announcements.some(a => a.priority === 'high') && (
        <div className="bg-white rounded p-3 text-gray-900 relative overflow-hidden shadow-sm hover:shadow-indigo-500/20 group">


          <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-3">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center border border-white/20 shadow-inner shrink-0 mt-1">
              <Sparkles className="w-5 h-5 " />
            </div>
            <div>
              <p className="text-gray-500 text-[8px] font-bold uppercase tracking-[0.2em] mb-0.5 leading-none">Featured Announcement</p>
              <h2 className="text-sm font-bold leading-tight">{announcements.find(a => a.priority === 'high')?.title}</h2>
              <p className="text-gray-500 mt-1 max-w-2xl text-[10px] leading-tight line-clamp-2">
                {announcements.find(a => a.priority === 'high')?.content}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Filter Sidebar */}
        <div className="lg:w-1/4 w-full space-y-2">
          <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
            <h3 className="font-black text-[10px] text-gray-900 mb-2 uppercase tracking-tighter leading-none">Categories</h3>
            <div className="space-y-1">
              {[
                { label: 'All Updates', value: 'all', count: announcements.length },
                { label: 'High Priority', value: 'high', count: announcements.filter(a => a.priority === 'high').length },
                { label: 'General', value: 'medium', count: announcements.filter(a => a.priority === 'medium').length },
                { label: 'Information', value: 'low', count: announcements.filter(a => a.priority === 'low').length }
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value as any)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded transition-all leading-none ${filter === cat.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                >
                  <span className="text-[9px] sm:text-[10px]">{cat.label}</span>
                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded leading-none ${filter === cat.value ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>


        </div>

        {/* Announcements List */}
        <div className="lg:w-3/4 w-full">
          <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[300px]">
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              {paginatedAnnouncements.length > 0 ? (
                <div className="w-full min-w-[500px]">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Title</th>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Date</th>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Content</th>
                        <th className="px-2 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedAnnouncements.map((announcement: any) => (
                        <tr key={announcement._id} className="hover:bg-gray-50/50 group transition-colors">
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                                <FileText size={10} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-900 leading-none">{announcement.title}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <span className="text-[8px] font-bold text-gray-500 uppercase leading-none">
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <p
                              className="text-[9px] font-bold text-gray-600 italic leading-tight cursor-help hover:text-indigo-600 transition-colors line-clamp-1 max-w-[150px] sm:max-w-xs"
                              title={announcement.content}
                            >
                              "{announcement.content}"
                            </p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[7px] uppercase font-black tracking-widest border leading-none ${getPriorityStyles(announcement.priority)}`}>
                              {announcement.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-bold">No announcements found</h3>
                  <p className="text-gray-500 text-sm mt-1">There are no updates for this category.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Showing <span className="text-gray-900">{filteredAnnouncements.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)}</span> of <span className="text-gray-900">{filteredAnnouncements.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="px-2 py-1 bg-white border border-gray-100 rounded text-[8px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all leading-none"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {totalPages > 0 ? (
                    [...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-5 h-5 flex items-center justify-center rounded text-[8px] font-black transition-all leading-none ${currentPage === i + 1
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))
                  ) : (
                    <button disabled className="w-5 h-5 flex items-center justify-center rounded text-[8px] font-black bg-indigo-600 text-white leading-none">1</button>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="px-2 py-1 bg-white border border-gray-100 rounded text-[8px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all leading-none"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AnnouncementsPage);
