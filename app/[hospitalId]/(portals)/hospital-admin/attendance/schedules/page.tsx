'use client';

import React, {  useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Users,
  Plus,
  ArrowRight,
  LayoutGrid,
  List,
  Search,
  Filter,
  CheckCircle2,
  Settings2,
  Trash2,
  Edit
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { toast } from 'react-hot-toast';

function ShiftManagement() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
  const { data: shifts = [], isLoading: loading, error } = useQuery<any[]>({
    queryKey: ['hospital-admin-shifts'],
    queryFn: async () => {
      const apiStartTime = performance.now();
      console.log(`[API] Starting shifts fetch`);
      try {
        const data = await hospitalAdminService.getShifts();
        const apiEndTime = performance.now();
        console.log(`[API] Shifts fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${data?.length || 0} shifts`);
        return data || [];
      } catch (error) {
        console.error("Failed to fetch shifts:", error);
        toast.error("Failed to load shift schedules");
        throw error;
      }
    },
    retry: 1,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'staff'>('name');

  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    color: 'blue'
  });

  const handleCreateShift = async () => {
    try {
      if (!newShift.name) return toast.error('Please enter a shift name');
      
      if (isEditMode && editingShiftId) {
        await hospitalAdminService.updateShift(editingShiftId, newShift);
        toast.success('Shift updated successfully');
      } else {
        await hospitalAdminService.createShift(newShift);
        toast.success('Shift initialized successfully');
      }
      
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingShiftId(null);
      setNewShift({ name: '', startTime: '09:00', endTime: '17:00', color: 'blue' });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-shifts'] });
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update shift' : 'Failed to create shift');
    }
  };

  const handleEditShift = (shift: any) => {
    setNewShift({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      color: shift.color || 'blue'
    });
    setEditingShiftId(shift._id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleOpenStaffModal = async (shift: any) => {
    setSelectedShift(shift);
    setIsStaffModalOpen(true);
    fetchStaffData(shift._id);
  };

  const fetchStaffData = async (shiftId: string) => {
    try {
      setLoadingStaff(true);
      const [allStaffRes, assignedRes] = await Promise.all([
        hospitalAdminService.getStaff(),
        hospitalAdminService.getShiftStaff(shiftId)
      ]);
      setAllStaff(allStaffRes.staff || []);
      setAssignedStaff(assignedRes || []);
    } catch (error) {
      toast.error('Failed to load personnel data');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    try {
      setAssigning(true);
      await hospitalAdminService.assignStaffToShift(selectedShift._id, [staffId]);
      toast.success('Personnel deployed successfully');
      fetchStaffData(selectedShift._id);
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-shifts'] });
    } catch (error) {
      toast.error('Deployment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      setAssigning(true);
      // To remove staff, we just assign them to no shift (null)
      await hospitalAdminService.updateStaff(staffId, { shift: null });
      toast.success('Personnel deallocated');
      fetchStaffData(selectedShift._id);
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-shifts'] });
    } catch (error) {
      toast.error('Deallocation failed');
    } finally {
      setAssigning(false);
    }
  };

  const filteredShifts = shifts
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'staff') return (b.staff || 0) - (a.staff || 0);
      return 0;
    });

  const handleOpenCreateModal = () => {
    setNewShift({ name: '', startTime: '09:00', endTime: '17:00', color: 'blue' });
    setIsEditMode(false);
    setEditingShiftId(null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full spin"></div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Dynamic Header with Advanced Filters */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        {/* Top Row: Identification, Process Button, and Stats */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
          
          <div className="shrink-0 flex items-center gap-2 px-1">
            <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Clock className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                Shift Management
              </h1>
              <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                Configure and monitor workforce shifts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
              <div className="p-1.5 bg-white rounded-md shadow-sm"><Clock className="w-4 h-4 text-gray-500" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total Shifts</span>
                <span className="text-sm font-bold text-gray-700 leading-none">{shifts.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 shrink-0">
              <div className="p-1.5 bg-white rounded-md shadow-sm"><Users className="w-4 h-4 text-emerald-500" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70">Staff Assigned</span>
                <span className="text-sm font-bold text-emerald-700 leading-none">
                  {shifts.reduce((acc: number, s: any) => acc + (s.staff || 0), 0)}
                </span>
              </div>
            </div>
            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-3 md:px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shrink-0 h-[34px]"
            >
              <Plus size={14} className="shrink-0" /> Create Shift
            </button>
          </div>
        </div>

        {/* Bottom Row: Control Center (Search, Filters, View Toggles) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
            
            {/* Search Bar - Takes remaining width */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search shifts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setSortBy(sortBy === 'name' ? 'staff' : 'name')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer h-[34px]"
              >
                <Filter className="w-3.5 h-3.5" /> 
                Sort: {sortBy === 'name' ? 'Name' : 'Staff'}
              </button>
              
              <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200 h-[34px]">
                <button 
                  onClick={() => setView('grid')}
                  className={`p-1.5 rounded transition-all shadow-sm ${view === 'grid' ? 'bg-white text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={`p-1.5 rounded transition-all shadow-sm ${view === 'list' ? 'bg-white text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-6 max-w-md w-full shadow-xl zoom-in ">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{isEditMode ? 'Update Shift' : 'Create New Shift'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Shift Name</label>
                <input 
                  type="text" 
                  value={newShift.name}
                  onChange={(e) => setNewShift({...newShift, name: e.target.value})}
                  placeholder="e.g. Night Shift"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Start Time</label>
                  <input 
                    type="time" 
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">End Time</label>
                  <input 
                    type="time" 
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Theme Color</label>
                <select 
                  value={newShift.color}
                  onChange={(e) => setNewShift({...newShift, color: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="blue">Blue</option>
                  <option value="emerald">Emerald</option>
                  <option value="indigo">Indigo</option>
                  <option value="rose">Rose</option>
                  <option value="amber">Amber</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  setEditingShiftId(null);
                  setNewShift({ name: '', startTime: '09:00', endTime: '17:00', color: 'blue' });
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateShift}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm text-sm"
              >
                {isEditMode ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredShifts.map((shift) => (
            <div key={shift._id} className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col group hover:shadow-md relative overflow-hidden h-full">
              <div className="absolute top-4 right-4 flex gap-1">
                <button 
                  onClick={() => handleEditShift(shift)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Delete shift configuration?')) {
                      hospitalAdminService.deleteShift(shift._id).then(() => {
                        toast.success('Shift deleted');
                        queryClient.invalidateQueries({ queryKey: ['hospital-admin-shifts'] });
                      });
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                shift.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                shift.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                shift.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                shift.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                <Clock className="w-6 h-6" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">{shift.name}</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {shift.startTime} - {shift.endTime}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-semibold">{shift.staff || 0} Assigned</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleOpenStaffModal(shift)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-blue-600 hover:text-white cursor-pointer"
                >
                  Manage Staff <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* New Shift Placeholder */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gray-50 dark:bg-gray-800/50 p-3 md:p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-4 group hover:border-blue-500 hover:bg-blue-50/50 min-h-[250px]"
          >
            <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:scale-110 shadow-sm">
              <Plus className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h3 className="text-xs md:text-base font-semibold text-gray-500 group-hover:text-blue-600">Add Shift</h3>
              <p className="text-xs text-gray-400 mt-1">Create a new schedule</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-2 md:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-xs md:text-base font-bold text-gray-900 dark:text-white">Shift List</h3>
          </div>
          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/30">
                  <th className="px-2 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-2 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-2 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Staffing</th>
                  <th className="px-2 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-2 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredShifts.map(shift => (
                  <tr key={shift._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                    <td className="px-2 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          shift.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                          shift.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-indigo-500/10 text-indigo-500'
                        }`}>
                           <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{shift.name}</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <span className="text-sm text-gray-500">{shift.startTime} - {shift.endTime}</span>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                           <div className={`h-full bg-blue-500 rounded-full`} style={{ width: `${Math.min((shift.staff/40)*100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{shift.staff || 0} staff</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button 
                           onClick={() => handleEditShift(shift)}
                           className="p-1.5 text-gray-400 hover:text-blue-500"
                         >
                           <Edit size={16} />
                         </button>
                         <button 
                           onClick={() => {
                             if (confirm('Delete shift configuration?')) {
                               hospitalAdminService.deleteShift(shift._id).then(() => {
                                 toast.success('Shift deleted');
                                 queryClient.invalidateQueries({ queryKey: ['hospital-admin-shifts'] });
                               });
                             }
                           }}
                           className="p-1.5 text-gray-400 hover:text-red-500"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* Staff Assignment Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 md:p-6 max-w-4xl w-full shadow-2xl zoom-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  Deploy Personnel: {selectedShift?.name}
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                     selectedShift?.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>{selectedShift?.startTime} - {selectedShift?.endTime}</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Assign staff to this shift.</p>
              </div>
              <button 
                onClick={() => setIsStaffModalOpen(false)}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
              {/* Assigned Staff */}
              <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-800/50 p-2 md:p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Assigned Staff ({assignedStaff.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {loadingStaff ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white dark:bg-gray-700 rounded-lg opacity-50" />)
                  ) : assignedStaff.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center">
                      <Users className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">No staff assigned yet</p>
                    </div>
                  ) : assignedStaff.map((s) => (
                    <div key={s._id} className="p-3 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          {s.user?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.user?.name}</p>
                          <p className="text-xs text-gray-500">{s.designation || 'Staff'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveStaff(s._id || s.staffProfileId)}
                        disabled={assigning}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Staff */}
              <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-800/50 p-2 md:p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" /> Available Staff
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {loadingStaff ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white dark:bg-gray-700 rounded-lg opacity-50" />)
                  ) : allStaff.filter(s => !assignedStaff.find(a => a._id === (s._id || s.staffProfileId))).map((s) => (
                    <div key={s._id || s.staffProfileId} className="p-3 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg flex items-center justify-between group hover:border-blue-500 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 flex items-center justify-center font-bold text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">{s.designation || 'Staff'}</p>
                            {s.shift && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-400 rounded">
                                In: {(s.shift as any).name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAssignStaff(s._id || s.staffProfileId)}
                        disabled={assigning}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => setIsStaffModalOpen(false)}
                className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg text-sm hover:bg-black shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(ShiftManagement);
