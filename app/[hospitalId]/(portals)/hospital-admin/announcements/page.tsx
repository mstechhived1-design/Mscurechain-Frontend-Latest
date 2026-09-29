'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Megaphone,
  Clock,
  AlertTriangle,
  Send,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { toast } from 'react-hot-toast';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  targetRoles: string[];
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  expiryDate?: string;
  createdAt: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
}

function AnnouncementManagement() {
  const queryClient = useQueryClient();

  // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
  const { data: announcements = [], isLoading: loading, error, refetch } = useQuery<Announcement[]>({
    queryKey: ['hospital-admin-announcements'],
    queryFn: async () => {
      const apiStartTime = performance.now();
      console.log(`[API] Starting announcements fetch`);
      try {
        const data = await hospitalAdminService.getAnnouncements();
        const announcementsArray = data?.announcements || [];
        const apiEndTime = performance.now();
        console.log(`[API] Announcements fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${announcementsArray.length} announcements`);
        return announcementsArray;
      } catch (error: any) {
        console.error("Failed to fetch announcements:", error);
        toast.error(error.message || "Failed to load announcements");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    targetRoles: ['all'],
    priority: 'medium',
    expiryDate: ''
  });

  const [search, setSearch] = useState('');

  // Helper: get current datetime string for `datetime-local` min (format: YYYY-MM-DDTHH:MM)
  const getNowDatetimeLocal = () => {
    const now = new Date();
    // offset to local time
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Filter nodes based on search + client-side expiry guard (full datetime comparison)
  const filteredAnnouncements = useMemo(() => {
    const now = new Date();
    return announcements.filter(ann => {
      // Client-side expiry guard — full datetime precision
      if (ann.expiryDate) {
        const expiry = new Date(ann.expiryDate);
        if (expiry <= now) return false; // expired
      }
      return (
        ann.title.toLowerCase().includes(search.toLowerCase()) ||
        ann.content.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [announcements, search]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hospitalAdminService.createAnnouncement(newAnnouncement);
      toast.success('Notice broadcasted successfully');
      setIsModalOpen(false);
      setNewAnnouncement({
        title: '',
        content: '',
        targetRoles: ['all'],
        priority: 'medium',
        expiryDate: ''
      });
      // Force immediate refresh of the registry
      await queryClient.invalidateQueries({ queryKey: ['hospital-admin-announcements'] });
      await refetch(); // Use refetch() to ensure the list updates immediately
    } catch (error) {
      toast.error('Failed to broadcast notice');
    }
  };

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmationId) return;
    try {
      await hospitalAdminService.deleteAnnouncement(deleteConfirmationId);
      toast.success('Notice retracted');
      await queryClient.invalidateQueries({ queryKey: ['hospital-admin-announcements'] });
      await refetch(); // Use refetch() to ensure the list updates immediately
      setDeleteConfirmationId(null);
    } catch (error) {
      toast.error('Failed to delete notice');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmationId(null);
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-100';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'low': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        {/* Top Row: Title, Minibadges, Action Button */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
            <div className="shrink-0 flex items-center gap-2 px-1">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                <Megaphone className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                  Notice Board
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                  Hospital-wide Global Broadcasts
                </p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-100">
              {[
                { label: "Active Sector", value: announcements.filter(a => a.isActive).length, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Critical Priority", value: announcements.filter(a => a.priority === 'high').length, color: "text-rose-600", bg: "bg-rose-50" },
                { label: "Aggregate Sent", value: announcements.length, color: "text-emerald-600", bg: "bg-emerald-50" }
              ].map((stat, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${stat.bg} ${stat.color} border border-slate-100/50`}>
                  <span className="text-[8px] font-bold uppercase tracking-widest">{stat.label}</span>
                  <span className="text-xs font-black">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end w-full xl:w-auto shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all h-[34px] shadow-sm whitespace-nowrap"
            >
              <Plus size={14} className="shrink-0" /> New Broadcast
            </button>
          </div>
        </div>

        {/* Bottom Row: Control Center (Search, Filters, View Toggles) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-gray-50 pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
            
            {/* Search Bar - Takes remaining width */}
            <div className="relative flex-1 w-full lg:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search announcements..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            {/* Pagination Controls */}
            {announcements.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1 h-[34px] shrink-0">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-[10px] font-black text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  &lt;
                </button>
                <span className="text-[10px] font-black text-slate-700 px-1">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-[10px] font-black text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clean Content Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center">
              <RefreshCw size={40} className="animate-spin text-slate-200 mx-auto" />
            </div>
          ) : currentItems.length > 0 ? (
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Title</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Content</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((announcement) => (
                  <tr key={announcement._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-2 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${announcement.priority === 'high' ? 'bg-rose-50 text-rose-500' :
                          announcement.priority === 'medium' ? 'bg-blue-50 text-blue-500' :
                            'bg-slate-50 text-slate-500'
                          }`}>
                          <Megaphone size={16} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{announcement.title}</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Calendar size={12} strokeWidth={3} />
                        {new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <p
                        className="text-xs font-medium text-slate-500 line-clamp-1 cursor-help"
                        title={announcement.content}
                      >
                        "{announcement.content}"
                      </p>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {announcement.targetRoles.map(role => (
                          <span key={role} className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${announcement.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        announcement.priority === 'medium' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {announcement.priority}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      {announcement.expiryDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                            <Clock size={11} strokeWidth={3} />
                            {new Date(announcement.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                          <span className="text-[9px] font-bold text-amber-400 pl-4">
                            {new Date(announcement.expiryDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No Expiry</span>
                      )}
                    </td>
                    <td className="px-2 md:px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(announcement._id)}
                        className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                        title="Retract Notice"
                      >
                        <Trash2 size={14} strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Megaphone className="text-slate-200 w-8 h-8" />
              </div>
              <h3 className="text-sm md:text-lg font-black text-slate-900 italic">No Announcements</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[240px] mx-auto">
                There are currently no active announcements.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modern Broadcast Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 italic leading-none">Create Announcement</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Send a notice to selected staff groups</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all"
              >
                <XCircle size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-2 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Announcement Title</label>
                  <input
                    required
                    type="text"
                    maxLength={80}
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="e.g. Hospital Staff Meeting tomorrow at 10:00 AM"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <div className="flex justify-end mt-1 px-1">
                    <span className="text-[9px] font-bold text-slate-400">{newAnnouncement.title.length}/80</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Announcement Details</label>
                  <textarea
                    required
                    rows={3}
                    maxLength={400}
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Enter detailed notice or instructions for hospital staff..."
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                  ></textarea>
                  <div className="flex justify-end mt-1 px-1">
                    <span className="text-[9px] font-bold text-slate-400">{newAnnouncement.content.length}/400</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Send Notice To</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      {[
                        { id: 'all', label: 'All Hospital Staff' },
                        { id: 'doctor', label: 'Doctors' },
                        { id: 'nurse', label: 'Nurses' },
                        { id: 'staff', label: 'General Staff' },
                        { id: 'helpdesk', label: 'Helpdesk / Reception' }
                      ].map((role) => (
                        <label key={role.id} className="flex items-center gap-3 group cursor-pointer">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="peer appearance-none w-5 h-5 bg-white border-2 border-slate-200 rounded-lg checked:bg-slate-900 checked:border-slate-900 transition-all cursor-pointer"
                              checked={newAnnouncement.targetRoles.includes(role.id)}
                              onChange={(e) => {
                                let roles = [...newAnnouncement.targetRoles];
                                if (e.target.checked) {
                                  if (role.id === 'all') {
                                    roles = ['all'];
                                  } else {
                                    roles = roles.filter(r => r !== 'all');
                                    roles.push(role.id);
                                  }
                                } else {
                                  roles = roles.filter(r => r !== role.id);
                                }
                                setNewAnnouncement({ ...newAnnouncement, targetRoles: roles });
                              }}
                            />
                            <CheckCircle2 size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Priority Level</label>
                      <select
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={newAnnouncement.priority}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })}
                      >
                        <option value="low">General Notice</option>
                        <option value="medium">Important / Action Required</option>
                        <option value="high">Urgent / High Priority</option>
                      </select>
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                         Expiry Date & Time <span className="text-amber-500 ml-1">(Optional)</span>
                       </label>
                       <input
                         type="datetime-local"
                         value={newAnnouncement.expiryDate}
                         onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiryDate: e.target.value })}
                         className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                       />
                       <p className="text-[8px] font-bold text-slate-400 px-1 mt-1">
                         Leave empty for no expiry.
                       </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Discard Draft
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                >
                 Send Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-3 md:p-6 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} strokeWidth={3} />
            </div>

            <h3 className="text-sm md:text-lg font-black text-slate-900 italic mb-2">Delete Broadcast</h3>
            <p className="text-xs font-medium text-slate-500 mb-6">
              if you want to delete this broadcast permanently, click on confirm retraction
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-500 text-white border border-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md shadow-rose-200"
              >
                Confirm Retraction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(AnnouncementManagement);
