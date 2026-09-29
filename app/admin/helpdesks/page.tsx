'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, User, Activity, Edit3, Search, Building2, Headphones, X } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import { useAuthStore } from '@/stores/authStore';
import {
  PageHeader,
  Table,
  Badge,
  Button,
  Modal,
  ConfirmModal,
  FormInput,
  getStatusVariant
} from '@/components/admin';
import type { Helpdesk } from '@/lib/integrations';

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

const getColor = (name: string) => {
  if (!name) return "bg-gray-500";
  const colors = ["bg-red-500", "bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function HelpDesksList() {
  const { isAuthenticated } = useAuthStore();
  const [helpdesks, setHelpdesks] = useState<Helpdesk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<Helpdesk | null>(null);
  const [editingStaff, setEditingStaff] = useState<Helpdesk | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger" as "danger" | "warning" | "info",
    onConfirm: () => { }
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchHospitals();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHelpDesks();
    }
  }, [isAuthenticated, debouncedSearch, currentPage, selectedHospital]);

  const fetchHospitals = async () => {
    try {
      const resp = await adminService.getHospitalsClient();
      setHospitals(resp || []);
    } catch (err: any) {
      console.error("Failed to fetch hospitals");
    }
  };

  const fetchHelpDesks = async () => {
    setLoading(true);
    try {
      const resp = await adminService.getUsersClient({
        role: 'helpdesk',
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        hospitalId: selectedHospital || undefined
      });
      if (resp && resp.users) {
        setHelpdesks(resp.users);
        setTotalPages(resp.pagination?.pages || 1);
        setTotalStaff(resp.pagination?.total || resp.users.length || 0);
      } else if (Array.isArray(resp)) {
        setHelpdesks(resp);
        setTotalPages(1);
        setTotalStaff(resp.length);
      } else {
        setHelpdesks([]);
        setTotalPages(1);
        setTotalStaff(0);
      }
    } catch (err: any) {
      console.error("Failed to fetch helpdesks", err);
      toast.error("Failed to fetch helpdesks");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Delete Front Desk Staff",
      message: "Are you sure you want to delete this front desk staff member? They will no longer have access to the dashboard.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          // Use the dedicated helpdesk delete endpoint
          await adminService.deleteUserClient(id);

          // Remove from local state
          setHelpdesks(prev => prev.filter((h) => h._id !== id));
          toast.success("Staff deleted successfully");

          // Refresh the list to ensure consistency
          await fetchHelpDesks();
        } catch (err: any) {
          console.error("Helpdesk delete failed:", err);
          toast.error(err.message || "Failed to delete staff");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (e: React.MouseEvent, staff: Helpdesk) => {
    e.stopPropagation();
    setEditingStaff({ ...staff });
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateUserClient(editingStaff._id, {
        name: editingStaff.name,
        email: editingStaff.email,
        mobile: editingStaff.mobile
      });

      setHelpdesks(helpdesks.map((h) => (h._id === updated._id ? { ...h, ...updated } : h)));
      setEditingStaff(null);
      toast.success("Staff updated successfully");
    } catch (err: any) {
      toast.error("Failed to update staff");
    } finally {
      setIsUpdating(false);
    }
  };

  // Server-side filtering, use helpdesks directly
  const filteredHelpDesks = helpdesks;

  const headers = ["Staff Information", "Hospital Assignment", "Contact", "Status", "Actions"];



  return (
    <div className="max-w-7xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-2 md:mb-6">
        <PageHeader
          title="Helpdesk & Front Desk"
          subtitle="Manage administrative staff and hospital assignments"
          icon={<Headphones className="text-orange-500" />}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-4 md:mb-6 mx-0">
        <div className="w-full lg:w-[70%] flex gap-2 md:gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full border rounded-xl pl-9 md:pl-12 pr-4 py-2.5 md:py-3.5 text-xs md:text-sm placeholder:text-[10px] md:placeholder:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div className="shrink-0 flex flex-col items-center justify-center bg-blue-500/5 border rounded-xl px-2.5 py-1.5 md:px-4 md:py-2 min-w-[50px] md:min-w-[80px]" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-[7px] md:text-[9px] uppercase font-bold text-gray-400 tracking-tighter md:tracking-wider leading-none mb-0.5">Total</span>
            <span className="text-xs md:text-base font-black text-blue-500 leading-none">{totalStaff}</span>
          </div>
        </div>

        <div className="w-full lg:w-[30%] flex flex-row items-center justify-between gap-2 md:gap-3">
          <div className="relative flex-1 group">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input
              list="hospitals-list-helpdesk"
              value={hospitalSearch}
              onChange={(e) => {
                setHospitalSearch(e.target.value);
                const h = hospitals.find(h => h.name === e.target.value);
                if (h) {
                  setSelectedHospital(h._id);
                  setCurrentPage(1);
                } else if (e.target.value === "") {
                  setSelectedHospital("");
                  setCurrentPage(1);
                }
              }}
              placeholder="Hospital Filter..."
              className="w-full border rounded-xl pl-8 pr-7 py-2 md:py-3 text-[10px] md:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
            {hospitalSearch && (
              <button
                onClick={() => { setHospitalSearch(""); setSelectedHospital(""); setCurrentPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={12} />
              </button>
            )}
            <datalist id="hospitals-list-helpdesk">
              {hospitals.map(h => <option key={h._id} value={h.name} />)}
            </datalist>
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 md:p-1 shadow-inner border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-1.5 md:px-3 py-1 text-[9px] md:text-xs font-bold uppercase transition-all hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
              style={{ color: 'var(--text-color)' }}
            >
              Prev
            </button>
            <div className="px-1.5 md:px-3 py-1 text-[9px] md:text-xs font-mono text-blue-500 font-bold border-x border-gray-200 dark:border-gray-700">
              {currentPage}/{totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-1.5 md:px-3 py-1 text-[9px] md:text-xs font-bold uppercase transition-all hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
              style={{ color: 'var(--text-color)' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Table headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={5} className="py-24 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm font-medium opacity-50">Loading staff...</p>
              </div>
            </td>
          </tr>
        ) : filteredHelpDesks.length > 0 ? (
          filteredHelpDesks.map((staff) => (
            <tr
              key={staff._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              onClick={() => setSelectedStaff(staff)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${getColor(staff.name)}`}>
                    {getInitials(staff.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-[11px] md:text-sm">{staff.name}</div>
                    <div className="text-[9px] md:text-[10px] opacity-40 font-mono leading-none mt-1">{staff._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-gray-400" />
                  <span className="text-[11px] md:text-sm font-medium">
                    {(staff.hospital && typeof staff.hospital === 'object') ? (staff.hospital as any).name : 'Unassigned'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-[10px] md:text-sm">{staff.mobile || 'No Mobile'}</div>
                <div className="text-[9px] md:text-xs opacity-60 mt-0.5">{staff.email}</div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={staff.status === 'active' ? 'success' : 'danger'}>
                  {staff.status.toUpperCase()}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(e, staff)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, staff._id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="py-12 text-center text-gray-500 italic">
              No helpdesk staff found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        title="Edit Staff Info"
      >
        {editingStaff && (
          <form onSubmit={handleUpdateStaff} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingStaff.name}
              onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingStaff.email}
              onChange={e => setEditingStaff({ ...editingStaff, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingStaff.mobile || ''}
              onChange={e => setEditingStaff({ ...editingStaff, mobile: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingStaff(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={isUpdating}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail View Modal */}
      <Modal
        isOpen={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        title="Staff Profile"
        maxWidth="max-w-2xl"
      >
        {selectedStaff && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-color)' }}>
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm ${getColor(selectedStaff.name)}`}>
                {getInitials(selectedStaff.name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
                <p className="text-orange-500 font-medium">Front Desk Staff</p>
                <div className="mt-2">
                  <Badge variant={selectedStaff.status === 'active' ? 'success' : 'danger'}>
                    {selectedStaff.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Contact Details</span>
                  <p className="mt-1 font-medium">{selectedStaff.mobile || 'N/A'}</p>
                  <p className="text-sm opacity-70">{selectedStaff.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Assigned At</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 size={16} className="text-gray-400" />
                    <span className="font-medium">
                      {(selectedStaff.hospital && typeof selectedStaff.hospital === 'object') ? (selectedStaff.hospital as any).name : 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="primary" onClick={() => setSelectedStaff(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function HelpDesksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Staff...</div>}>
      <HelpDesksList />
    </Suspense>
  );
}

export default React.memo(HelpDesksPage);
