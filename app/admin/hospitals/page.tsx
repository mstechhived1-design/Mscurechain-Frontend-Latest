'use client';

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { 
  Trash2, 
  Building2, 
  Activity, 
  Search, 
  MapPin, 
  Star, 
  Eye, 
  Plus, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Bed, 
  ShieldCheck, 
  CheckCircle,
  Edit
} from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import { useAuthStore } from '@/stores/authStore';
import { 
  PageHeader, 
  Badge, 
  Button, 
  Modal, 
  ConfirmModal,
  getStatusVariant
} from '@/components/admin';
import type { Hospital } from '@/lib/integrations';

const HospitalsList = () => {
    const { isAuthenticated } = useAuthStore();
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger" as "danger" | "warning" | "info" | "success",
        onConfirm: () => {}
    });

    useEffect(() => {
      if (isAuthenticated) {
        fetchHospitals();
      }
    }, [isAuthenticated]);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const data = await adminService.getHospitalsClient();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch hospitals", err);
      toast.error("Failed to load infrastructure records.");
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Decommission Hospital",
      message: "Are you sure you want to remove this hospital from the network? This will permanently delete the hospital and all associated helpdesks and doctor assignments. This action is irreversible.",
      confirmText: "Decommission",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        try {
          await adminService.deleteHospitalClient(id);
          setHospitals(prev => prev.filter((h) => h._id !== id));
          toast.success("Hospital and all associated records deleted successfully");
          
          // Refresh the list to ensure consistency
          await fetchHospitals();
        } catch (err: any) {
          toast.error(err.message || "Failed to decommission hospital");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleStatusToggle = (id: string, currentStatus: string) => {
    const isApproved = currentStatus === 'approved' || currentStatus === 'active';
    const newStatus = isApproved ? "suspended" : "approved";
    const actionVerb = isApproved ? "Suspend" : "Approve";

    setConfirmModal({
      isOpen: true,
      title: `${actionVerb} Network Access`,
      message: `Are you sure you want to ${actionVerb.toLowerCase()} this node's access? This will affect live visibility.`,
      confirmText: actionVerb,
      cancelText: "Cancel",
      type: isApproved ? "warning" : "success",
      onConfirm: async () => {
        try {
          await adminService.updateHospitalStatusClient(id, newStatus);
          setHospitals(prev => prev.map(h => h._id === id ? { ...h, status: newStatus as any } : h));
          toast.success(`Access ${isApproved ? 'suspended' : 'restored'} successfully`);
        } catch (err: any) {
          toast.error("Status update failed");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredHospitals = hospitals.filter((hospital) => {
    const term = searchQuery.toLowerCase();
    return (
      (hospital.name?.toLowerCase() || "").includes(term) ||
      (hospital.address?.toLowerCase() || "").includes(term) ||
      (hospital.pincode || "").includes(term)
    );
  });


  return (
    <div className="max-w-7xl mx-auto pb-8 md:pb-12 md:px-0">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type as any}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-5 md:mb-8">
        <PageHeader
            title="Hospitals Registry"
            subtitle="Central monitoring and management of healthcare network nodes"
            icon={<Building2 className="text-orange-500" />}
        />
        <Link href="/admin/create-hospital">
            <Button icon={<Plus size={18} />} className="shadow-lg shadow-blue-500/20">
                Register New Node
            </Button>
        </Link>
      </div>

      <div className="mb-5 md:mb-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={16} />
          <input
            type="text"
            placeholder="Search registry by name, location, or pincode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 text-xs md:text-sm placeholder:text-[10px] md:placeholder:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm group-hover:shadow-md"
            style={{ 
                backgroundColor: 'var(--card-bg)', 
                color: 'var(--text-color)', 
                borderColor: 'var(--border-color)' 
            }}
          />
      </div>

      {/* ── Skeleton Cards while fetching ─────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl md:rounded-2xl border p-5 space-y-4"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredHospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredHospitals.map((hospital) => (
                <div key={hospital._id} className="group rounded-xl md:rounded-2xl border hover:shadow-xl hover:border-blue-500/50 flex flex-col h-full bg-linear-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 overflow-hidden"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="p-4 md:p-5 grow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-blue-500/5 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/10 group-hover:scale-110">
                                <Building2 size={24} />
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                <Badge variant={getStatusVariant(hospital.status || "pending")}>
                                    <span className="flex items-center gap-1.5 uppercase font-bold text-[8px]">
                                        {(hospital.status || 'pending').toUpperCase()}
                                    </span>
                                </Badge>
                                <div className="flex items-center gap-1 mt-1">
                                    <Link href={`/admin/edit-hospital/${hospital._id}`}>
                                        <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-900 rounded-lg border border-transparent hover:border-blue-500/20 transition-colors"
                                            title="Edit Node"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    </Link>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(hospital._id); }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-900 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
                                        title="Decommission Node"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-base font-bold mb-1 group-hover:text-blue-500 line-clamp-1">{hospital.name}</h3>
                        <p className="text-[10px] flex items-start gap-2 mb-3 opacity-60 min-h-[24px] line-clamp-2">
                            <MapPin size={10} className="shrink-0 mt-0.5 text-blue-500" /> 
                            {hospital.address}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-xs mb-3 bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="space-y-0.5">
                                <span className="block text-[8px] uppercase font-bold opacity-30 tracking-widest">Trust Index</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-yellow-500">
                                    <Star size={12} fill="currentColor" />
                                    {hospital.rating || "4.5"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 pt-0 mt-auto flex flex-col gap-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedHospital(hospital)}
                                className="flex-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-2 group/btn"
                            >
                                <Eye size={12} className="group-hover/btn:scale-110 text-blue-500" /> Infrastructure
                            </button>
                            <button
                                onClick={() => handleStatusToggle(hospital._id, hospital.status)}
                                className={`px-2.5 rounded-xl text-white shadow-lg active:scale-95 ${
                                    (hospital.status === 'approved' || hospital.status === 'active') 
                                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' 
                                    : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                                }`}
                                title={hospital.status === 'approved' ? 'Suspend Access' : 'Approve Network Member'}
                            >
                                <Activity size={14} />
                            </button>
                        </div>
                        <Link href={`/admin/hospitals/${hospital._id}`}>
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
                                <ShieldCheck size={12} /> Personnel & Login IDs
                            </button>
                        </Link>
                    </div>

                </div>
            ))}
          </div>
      ) : (
          <div className="py-24 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border-color)' }}>
              <Building2 className="mx-auto text-gray-200 mb-4" size={64} />
              <p className="text-xl font-bold opacity-50">Empty Node Registry</p>
              <p className="text-sm opacity-30 mt-2">No infrastructure matching your query was found.</p>
          </div>
      )}

      {/* Hospital Detail View Modal */}
      <Modal
        isOpen={!!selectedHospital}
        onClose={() => setSelectedHospital(null)}
        title="Infrastructure Overview"
        maxWidth="max-w-4xl"
      >
        {selectedHospital && (
          <div className="space-y-6 max-h-[65vh] overflow-y-auto overflow-x-hidden no-scrollbar pr-1 pb-4">
            <div className="flex flex-col md:flex-row items-start gap-5 border-b pb-6" style={{ borderColor: 'var(--border-color)' }}>
               <div className="w-20 h-20 rounded-2xl bg-blue-500/5 flex items-center justify-center border border-blue-500/10 shrink-0 shadow-sm">
                  <Building2 className="text-blue-500" size={40} />
               </div>
               <div className="pt-1 grow">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-1">{selectedHospital.name}</h2>
                    <Badge variant={getStatusVariant(selectedHospital.status)}>
                        {(selectedHospital.status || 'pending').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800">
                        <MapPin size={12} className="text-blue-500" />
                        PIN: {selectedHospital.pincode}
                    </div>
                    {selectedHospital.establishedYear && (
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800">
                            EST: {selectedHospital.establishedYear}
                        </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div>
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-2">
                        <ShieldCheck size={12} /> Official Connectivity
                    </h3>
                    <div className="space-y-3 bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-400">
                                <Phone size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Phone Line</p>
                                <p className="text-sm font-bold">{selectedHospital.phone || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-400">
                                <Mail size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Email Node</p>
                                <p className="text-sm font-bold">{selectedHospital.email || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-400">
                                <Globe size={14} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Web Presence</p>
                                <p className="text-sm font-bold text-blue-500 truncate max-w-[180px]">{selectedHospital.website || 'None registered'}</p>
                            </div>
                        </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mb-3">Operations</h3>
                    <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <Clock size={16} className="text-orange-500" />
                        <div>
                             <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Active Hours</p>
                             <p className="text-sm font-bold">{selectedHospital.operatingHours || "24x7 Emergency Ready"}</p>
                        </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <CheckCircle className="text-green-500" size={18} />
                          <span className="text-xs font-bold">Ambulance Readiness</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedHospital.ambulanceAvailability || selectedHospital.ambulanceAvailable ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                          {selectedHospital.ambulanceAvailability || selectedHospital.ambulanceAvailable ? 'READY' : 'N/A'}
                      </span>
                  </div>

                  <div>
                     <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest mb-2">Address Fingerprint</p>
                     <p className="text-xs italic opacity-70 leading-relaxed dark:text-gray-300">
                        "{selectedHospital.address}"
                     </p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
               <div>
                   <h3 className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mb-3">Network Specialties</h3>
                   <div className="flex flex-wrap gap-2">
                      {(selectedHospital.specialties || selectedHospital.specialities || []).length > 0 ? 
                        (selectedHospital.specialties || selectedHospital.specialities || []).map((s, i) => (
                          <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-blue-500/5 text-blue-600 border border-blue-500/10">
                            {s.toUpperCase()}
                          </span>
                        )) : 
                        <span className="text-xs italic opacity-30">No specialties listed in global registry.</span>
                      }
                   </div>
               </div>
               <div>
                   <h3 className="text-[9px] font-bold uppercase tracking-widest text-green-500 mb-3">Patient Services</h3>
                   <div className="flex flex-wrap gap-2">
                      {selectedHospital.services && selectedHospital.services.length > 0 ? 
                        selectedHospital.services.map((s, i) => (
                          <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-green-500/5 text-green-600 border border-green-500/10">
                            {s.toUpperCase()}
                          </span>
                        )) : 
                        <span className="text-xs italic opacity-30">No digital services registered.</span>
                      }
                   </div>
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
               <Button variant="ghost" onClick={() => setSelectedHospital(null)} className="px-6 py-2 h-auto text-sm">
                  Dismiss
               </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

function HospitalsPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    }>
      <HospitalsList />
    </Suspense>
  );
}

export default React.memo(HospitalsPage);
