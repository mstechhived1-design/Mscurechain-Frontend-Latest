'use client';

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { Trash2, User, Activity, Edit3, Search, Stethoscope, Building2, X } from "lucide-react";
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
import type { Doctor } from '@/lib/integrations';

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

function DoctorsList() {
  const { isAuthenticated } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDoctors, setTotalDoctors] = useState(0);
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



  const fetchHospitals = useCallback(async () => {
    try {
      const resp = await adminService.getHospitalsClient();
      setHospitals(resp || []);
    } catch (err: any) {
      console.error("Failed to fetch hospitals");
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await adminService.getUsersClient({
        role: 'doctor',
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        hospitalId: selectedHospital || undefined
      });
      if (resp && resp.users) {
        setDoctors(resp.users);
        setTotalPages(resp.pagination?.pages || 1);
        setTotalDoctors(resp.pagination?.total || resp.users.length || 0);
      } else if (Array.isArray(resp)) {
        setDoctors(resp);
        setTotalPages(1);
        setTotalDoctors(resp.length);
      } else {
        setDoctors([]);
        setTotalPages(1);
        setTotalDoctors(0);
      }
    } catch (err: any) {
      console.error("Failed to fetch doctors", err);
      toast.error("Failed to fetch doctors");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedHospital]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHospitals();
    }
  }, [isAuthenticated, fetchHospitals]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors();
    }
  }, [isAuthenticated, fetchDoctors]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Delete Doctor",
      message: "Are you sure you want to delete this doctor? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await adminService.deleteUserClient(id);
          setDoctors(doctors.filter((d) => d._id !== id));
          toast.success("Doctor deleted successfully");
        } catch (err: any) {
          toast.error("Failed to delete doctor");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (e: React.MouseEvent, doctor: Doctor) => {
    e.stopPropagation();
    setEditingDoctor({ ...doctor });
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateUserClient(editingDoctor._id, {
        name: editingDoctor.name,
        email: editingDoctor.email,
        mobile: editingDoctor.mobile
      });

      setDoctors(doctors.map((d) => (d._id === updated._id ? { ...d, ...updated } : d)));
      setEditingDoctor(null);
      toast.success("Doctor updated successfully");
    } catch (err: any) {
      toast.error("Failed to update doctor");
    } finally {
      setIsUpdating(false);
    }
  };

  // Use server-side filtering, so we use doctors directly
  const filteredDoctors = doctors;

  const headers = ["Doctor", "Specialties", "Contact", "Status", "Actions"];



  return (
    <div className="max-w-7xl mx-auto pb-4">
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
          title="Doctors Management"
          subtitle="Manage and monitor all healthcare professionals"
          icon={<Stethoscope className="text-green-500" />}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-4 md:mb-6 mx-0">
        <div className="w-full lg:w-[70%] flex gap-2 md:gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email or specialty..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full border rounded-xl pl-9 md:pl-12 pr-4 py-2.5 md:py-3.5 text-xs md:text-sm placeholder:text-[10px] md:placeholder:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div className="shrink-0 flex flex-col items-center justify-center bg-blue-500/5 border rounded-xl px-2.5 py-1.5 md:px-4 md:py-2 min-w-[50px] md:min-w-[80px]" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-[7px] md:text-[9px] uppercase font-bold text-gray-400 tracking-tighter md:tracking-wider leading-none mb-0.5">Total</span>
            <span className="text-xs md:text-base font-black text-blue-500 leading-none">{totalDoctors}</span>
          </div>
        </div>

        <div className="w-full lg:w-[30%] flex flex-row items-center justify-between gap-2 md:gap-3">
          <div className="relative flex-1 group">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input
              list="hospitals-list"
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
            <datalist id="hospitals-list">
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
                <p className="text-sm font-medium opacity-50">Loading doctors...</p>
              </div>
            </td>
          </tr>
        ) : filteredDoctors.length > 0 ? (
          filteredDoctors.map((doctor) => (
            <tr
              key={doctor._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              onClick={() => setSelectedDoctor(doctor)}
            >
              <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap min-w-[120px] md:min-w-0">
                <div className="flex items-center gap-2 md:gap-3">
                  {doctor.profilePic ? (
                    <img
                      src={doctor.profilePic}
                      alt={doctor.name}
                      className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full object-cover border"
                      style={{ borderColor: 'var(--border-color)' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.png"; }}
                    />
                  ) : (
                    <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[10px] md:text-xs ${getColor(doctor.name)}`}>
                      {getInitials(doctor.name)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-[11px] md:text-sm truncate leading-none">{doctor.name}</div>
                    <div className="text-[9px] md:text-[10px] opacity-40 font-mono leading-none mt-1">{doctor._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4">
                <div className="flex flex-wrap gap-1">
                  {doctor.specialties && doctor.specialties.length > 0 ? (
                    doctor.specialties.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {s}
                      </span>
                    ))
                  ) : <span className="text-[10px] md:text-xs opacity-40 italic">None</span>}
                  {doctor.specialties && doctor.specialties.length > 2 && (
                    <span className="text-[8px] md:text-[10px] opacity-50">+{doctor.specialties.length - 2} more</span>
                  )}
                </div>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                <div className="font-medium text-[10px] md:text-sm leading-none">{doctor.mobile}</div>
                <div className="text-[9px] md:text-xs opacity-60 mt-1 leading-none truncate max-w-[120px]">{doctor.email}</div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={doctor.status === 'active' ? 'success' : 'danger'}>
                  {doctor.status.toUpperCase()}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(e, doctor)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, doctor._id)}
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
              No doctors found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingDoctor}
        onClose={() => setEditingDoctor(null)}
        title="Edit Doctor Info"
      >
        {editingDoctor && (
          <form onSubmit={handleUpdateDoctor} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingDoctor.name}
              onChange={e => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingDoctor.email}
              onChange={e => setEditingDoctor({ ...editingDoctor, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingDoctor.mobile || ''}
              onChange={e => setEditingDoctor({ ...editingDoctor, mobile: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingDoctor(null)}>
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
        isOpen={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title="Doctor Profile"
        maxWidth="max-w-2xl"
      >
        {selectedDoctor && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-color)' }}>
              {selectedDoctor.profilePic ? (
                <img src={selectedDoctor.profilePic} className="w-24 h-24 rounded-2xl object-cover border shadow-sm" alt="" />
              ) : (
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-sm ${getColor(selectedDoctor.name)}`}>
                  {getInitials(selectedDoctor.name)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{selectedDoctor.name}</h2>
                <p className="text-blue-500 font-medium">{selectedDoctor.qualification || 'Medical Professional'}</p>
                <div className="mt-2">
                  <Badge variant={selectedDoctor.status === 'active' ? 'success' : 'danger'}>
                    {selectedDoctor.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Contact Details</span>
                  <p className="mt-1 font-medium">{selectedDoctor.mobile || 'N/A'}</p>
                  <p className="text-sm opacity-70">{selectedDoctor.email}</p>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Current Hospital</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 size={16} className="text-gray-400" />
                    <span className="font-medium">
                      {(selectedDoctor.hospital && typeof selectedDoctor.hospital === 'object') ? (selectedDoctor.hospital as any).name : 'Not Assigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Experience</span>
                  <p className="mt-1 font-medium italic">
                    {selectedDoctor.experienceStartDate ? `${new Date().getFullYear() - new Date(selectedDoctor.experienceStartDate).getFullYear()} Years Practice` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Consultation Fee</span>
                  <p className="mt-1 text-xl font-bold text-green-500">₹{selectedDoctor.consultationFee || 0}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Specialties</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedDoctor.specialties && selectedDoctor.specialties.length > 0 ?
                  selectedDoctor.specialties.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {s}
                    </span>
                  )) :
                  <span className="text-sm italic opacity-50">None listed</span>
                }
              </div>
            </div>

            {selectedDoctor.bio && (
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Bio</span>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  "{selectedDoctor.bio}"
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="primary" onClick={() => setSelectedDoctor(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DoctorsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Doctors...</div>}>
      <DoctorsList />
    </Suspense>
  );
}

export default React.memo(DoctorsPage);
