'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  AlertTriangle,
  User,
  ExternalLink,
  Sparkles,
  FileText,
  ChevronLeft
} from 'lucide-react';

import { doctorService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function DoctorAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Pagination State
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
      const data = await doctorService.getAnnouncements();
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
      case 'high': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'low': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default: return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const filteredAnnouncements = useMemo(() => {
    const raw = filter === 'all'
      ? announcements
      : announcements.filter(a => a.priority === filter);

    // Frontend Filter: Only show if 'all' or 'doctor' is in targetRoles
    return raw.filter(a =>
      !a.targetRoles ||
      a.targetRoles.includes('all') ||
      a.targetRoles.includes('doctor')
    );
  }, [announcements, filter]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-theme"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0">
         {/* Top Row: Title, Action Button, Pagination */}
         <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3 shrink-0">
               <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <Bell className="w-4 h-4 md:w-5 md:h-5" />
               </div>
               <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase flex items-center gap-2">
                     Announcements
                     {announcements.filter(a => a.priority === 'high').length > 0 && (
                        <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 animate-pulse">
                           <AlertTriangle size={8} /> Urgent
                        </span>
                     )}
                  </h1>
                  <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                     {filteredAnnouncements.length} Updates Available
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
               {/* Refresh Button */}
               <button
                  onClick={loadAnnouncements}
                  className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 transition-all shadow-sm shrink-0"
                  title="Refresh Data"
               >
                  Refresh
               </button>

               {/* Pagination */}
               {filteredAnnouncements.length > 0 && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                     <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">
                        <span className="text-gray-900 dark:text-white">Page {currentPage}</span> / {totalPages}
                     </div>
                     <div className="flex items-center gap-1">
                        <button
                           onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                           disabled={currentPage === 1}
                           className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                        >
                           <ChevronLeft size={12} />
                        </button>
                        <button
                           onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                           disabled={currentPage === totalPages || totalPages === 0}
                           className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                        >
                           <ChevronRight size={12} />
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Bottom Row: Control Center (Filters) */}
         <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-3">
            <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar max-w-full">
               {[
                  { label: 'All Updates', value: 'all', count: announcements.length },
                  { label: 'High Priority', value: 'high', count: announcements.filter(a => a.priority === 'high').length },
                  { label: 'General', value: 'medium', count: announcements.filter(a => a.priority === 'medium').length },
                  { label: 'Information', value: 'low', count: announcements.filter(a => a.priority === 'low').length }
               ].map(cat => (
                  <button
                     key={cat.value}
                     onClick={() => setFilter(cat.value as any)}
                     className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        filter === cat.value 
                        ? 'bg-white dark:bg-[#111] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                     }`}
                  >
                     {cat.label}
                     <span className={`px-1 py-0.5 rounded text-[8px] font-black ${filter === cat.value ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        {cat.count}
                     </span>
                  </button>
               ))}
            </div>
         </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-8">
        {/* Announcements Content */}
        <div className="w-full">
          {/* Mobile View: Cards */}
          <div className="block sm:hidden space-y-3">
            {currentItems.length > 0 ? (
              currentItems.map((announcement) => (
                <div key={announcement._id} className="bg-white dark:bg-card p-4 rounded-2xl border border-gray-100 dark:border-border-theme shadow-sm relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${announcement.priority === 'high' ? 'bg-red-500' :
                      announcement.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />

                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getPriorityStyles(announcement.priority)}`}>
                      {announcement.priority}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">{announcement.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-3">"{announcement.content}"</p>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-card p-10 rounded-2xl border border-gray-100 dark:border-border-theme flex flex-col items-center justify-center text-center">
                <Bell className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No announcements</p>
              </div>
            )}
          </div>

          {/* Tablet/Desktop View: Table */}
          <div className="hidden sm:block bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-border-theme overflow-hidden">
            <div className="overflow-x-auto">
              {currentItems.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-secondary-theme/30 border-b border-gray-100 dark:border-border-theme">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Updates</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-32">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-border-theme">
                    {currentItems.map((announcement) => (
                      <tr key={announcement._id} className="hover:bg-gray-50/10 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${announcement.priority === 'high' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' :
                                announcement.priority === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/20' :
                                  'bg-blue-50 text-blue-500 dark:bg-blue-900/20'
                              }`}>
                              <FileText size={18} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900 dark:text-white text-sm">{announcement.title}</span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic italic">"{announcement.content}"</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase">
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPriorityStyles(announcement.priority)}`}>
                            {announcement.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                    <Bell size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 dark:text-white font-black uppercase tracking-tighter text-lg">No announcements</h3>
                  <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">There are no updates in this category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DoctorAnnouncementsPage);
