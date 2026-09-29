'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, User, Edit3, Search, Building2, MapPin, Phone, Mail, X } from "lucide-react";
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
  FormSelect
} from '@/components/admin';

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

function HospitalAdminsList() {
  const { isAuthenticated } = useAuthStore();
  const [hospitalAdmins, setHospitalAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: "",
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
      fetchHospitalAdmins();
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

  const fetchHospitalAdmins = async () => {
    setLoading(true);
    try {
      const resp = await adminService.getUsersClient({
        role: 'hospital-admin',
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        hospitalId: selectedHospital || undefined
      });
      if (resp && resp.users) {
        setHospitalAdmins(resp.users);
        setTotalPages(resp.pagination?.pages || 1);
        setTotalAdmins(resp.pagination?.total || resp.users.length || 0);
      } else if (Array.isArray(resp)) {
        setHospitalAdmins(resp);
        setTotalPages(1);
        setTotalAdmins(resp.length);
      } else {
        setHospitalAdmins([]);
        setTotalPages(1);
        setTotalAdmins(0);
      }
    } catch (err: any) {
      console.error("Failed to fetch hospital admins", err);
      toast.error("Failed to fetch hospital administrators");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      id: id,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await adminService.deleteUserClient(id);
          setHospitalAdmins(hospitalAdmins.filter((a) => a._id !== id));
          toast.success("Hospital admin deleted successfully");
        } catch (err: any) {
          toast.error(err.message || "Failed to delete hospital admin");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (admin: any) => {
    setEditingAdmin({ ...admin });
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsUpdating(true);
    try {
      const payload: any = {
        name: editingAdmin.name,
        email: editingAdmin.email,
        mobile: editingAdmin.mobile,
        status: editingAdmin.status
      };

      if (editingAdmin.password) {
        payload.password = editingAdmin.password;
      }

      const updated = await adminService.updateUserClient(editingAdmin._id, payload);

      setHospitalAdmins(hospitalAdmins.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));
      setEditingAdmin(null);
      toast.success("Hospital admin updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update hospital admin");
    } finally {
      setIsUpdating(false);
    }
  };

  // Server-side filtering, use hospitalAdmins directly
  const filteredAdmins = hospitalAdmins;

  const headers = ["Hospital Admin Details", "Hospital", "Contact Information", "Status", "Actions"];



  return (
    <div className="max-w-7xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title="Remove Hospital Administrator"
        message="Are you sure you want to remove this hospital administrator? They will immediately lose access to their hospital dashboard."
        confirmText="Remove Access"
        type="danger"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-2 md:mb-6">
        <PageHeader
          title="Hospital Administrators"
          subtitle="Manage hospital-level administrative accounts"
          icon={<Building2 className="text-blue-500" />}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-4 md:mb-6 mx-0">
        <div className="w-full lg:w-[70%] flex gap-2 md:gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or hospital..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full border rounded-xl pl-9 md:pl-12 pr-4 py-2.5 md:py-3.5 text-xs md:text-sm placeholder:text-[10px] md:placeholder:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div className="shrink-0 flex flex-col items-center justify-center bg-blue-500/5 border rounded-xl px-2.5 py-1.5 md:px-4 md:py-2 min-w-[50px] md:min-w-[80px]" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-[7px] md:text-[9px] uppercase font-bold text-gray-400 tracking-tighter md:tracking-wider leading-none mb-0.5">Total</span>
            <span className="text-xs md:text-base font-black text-blue-500 leading-none">{totalAdmins}</span>
          </div>
        </div>

        <div className="w-full lg:w-[30%] flex flex-row items-center justify-between gap-2 md:gap-3">
          <div className="relative flex-1 group">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input
              list="hospitals-list-admins"
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
            <datalist id="hospitals-list-admins">
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
                <p className="text-sm font-medium opacity-50">Loading hospital administrators...</p>
              </div>
            </td>
          </tr>
        ) : filteredAdmins.length > 0 ? (
          filteredAdmins.map((admin) => (
            <tr
              key={admin._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${getColor(admin.name)}`}>
                    {getInitials(admin.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-[11px] md:text-sm">{admin.name}</div>
                    <div className="text-[9px] md:text-[10px] opacity-40 font-mono leading-none mt-1">{admin._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                {(admin.hospital || admin.hospitalId) ? (
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-500" />
                    <div>
                      <div className="font-medium text-[11px] md:text-sm">
                        {typeof admin.hospital === 'object' ? admin.hospital.name :
                          (typeof admin.hospitalId === 'object' ? admin.hospitalId.name : 'Unknown')}
                      </div>
                      {(typeof admin.hospital === 'object' && admin.hospital.hospitalId) ? (
                        <div className="text-xs opacity-60">{admin.hospital.hospitalId}</div>
                      ) : (typeof admin.hospitalId === 'object' && admin.hospitalId.hospitalId && (
                        <div className="text-xs opacity-60">{admin.hospitalId.hospitalId}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs opacity-50">No hospital assigned</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 mb-1 text-[10px] md:text-sm">
                  <Phone size={14} className="opacity-60" />
                  <span>{admin.mobile || 'No Mobile'}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] md:text-xs opacity-60">
                  <Mail size={14} />
                  <span>{admin.email || 'No Email'}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={admin.status === 'active' ? 'info' : 'danger'}>
                  {admin.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEditClick(admin)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(admin._id)}
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
              No hospital administrators found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        title="Update Hospital Admin Record"
      >
        {editingAdmin && (
          <form onSubmit={handleUpdateAdmin} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingAdmin.name || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingAdmin.email || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingAdmin.mobile || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, mobile: e.target.value })}
            />
            <FormSelect
              label="Status"
              value={editingAdmin.status || 'active'}
              onChange={e => setEditingAdmin({ ...editingAdmin, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
            />
            <FormInput
              label="New Password"
              type="password"
              placeholder="Leave blank to keep current password"
              value={editingAdmin.password || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingAdmin(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={isUpdating}>
                Update Record
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function HospitalAdminsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Hospital Administrators...</div>}>
      <HospitalAdminsList />
    </Suspense>
  );
}

export default React.memo(HospitalAdminsPage);
