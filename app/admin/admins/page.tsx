'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, Edit3, Search, ShieldCheck } from "lucide-react";
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
  FormInput
} from '@/components/admin';
import type { Admin } from '@/lib/integrations';

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

function AdminsList() {
  const { isAuthenticated } = useAuthStore();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: "",
    onConfirm: () => { }
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdmins();
    }
  }, [isAuthenticated]);

  const fetchAdmins = async () => {
    try {
      const data = await adminService.getUsersClient({ role: 'admin' });
      const parsedArray = Array.isArray(data) ? data : (data as any).users || [];
      setAdmins(parsedArray);
    } catch (err: any) {
      console.error("Failed to fetch admins", err);
      toast.error("Failed to fetch admins");
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
          setAdmins(admins.filter((a) => a._id !== id));
          toast.success("Admin deleted successfully");
        } catch (err: any) {
          toast.error("Failed to delete admin");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (admin: Admin) => {
    setEditingAdmin({ ...admin });
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateUserClient(editingAdmin._id, {
        name: editingAdmin.name,
        email: editingAdmin.email,
        mobile: editingAdmin.mobile
      });

      setAdmins(admins.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));
      setEditingAdmin(null);
      toast.success("Admin updated successfully");
    } catch (err: any) {
      toast.error("Failed to update admin");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAdmins = admins.filter((admin) =>
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const headers = ["Admin Details", "Contact Information", "Status", "Actions"];

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Loading admins...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title="Remove Administrator"
        message="Are you sure you want to remove this administrator? They will immediately lose all system privileges."
        confirmText="Remove Access"
        type="danger"
      />

      <PageHeader
        title="Platform Administrators"
        subtitle="Manage system-wide administrative accounts"
        icon={<ShieldCheck className="text-red-500" />}
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
        />
      </div>

      <Table headers={headers}>
        {filteredAdmins.length > 0 ? (
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
                    <div className="font-semibold">{admin.name}</div>
                    <div className="text-xs opacity-50 font-mono mt-0.5">{admin._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm">
                <div>{admin.mobile || 'No Mobile'}</div>
                <div className="text-xs opacity-60 mt-1">{admin.email}</div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={admin.status === 'active' ? 'info' : 'danger'}>
                  {admin.status.toUpperCase()}
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
            <td colSpan={4} className="py-12 text-center text-gray-500 italic">
              No administrators found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        title="Update Admin Record"
      >
        {editingAdmin && (
          <form onSubmit={handleUpdateAdmin} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingAdmin.name}
              onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingAdmin.email}
              onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingAdmin.mobile || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, mobile: e.target.value })}
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

function AdminsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Administrators...</div>}>
      <AdminsList />
    </Suspense>
  );
}

export default React.memo(AdminsPage);
