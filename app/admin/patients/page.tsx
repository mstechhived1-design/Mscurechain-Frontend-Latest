'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, User, Activity, Edit3, Search, Heart, ShieldAlert, Building2, X, Download } from "lucide-react";
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
import type { Patient } from '@/lib/integrations';



const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

const calculateAge = (dob: string | Date) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  if (isNaN(diff)) return null;
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

const getPatientAge = (patient: any) => {
    return patient.age || patient.profile?.age || patient.patientProfile?.age || (patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null) || (patient.dob ? calculateAge(patient.dob) : null) || (patient.profile?.dob ? calculateAge(patient.profile.dob) : null);
};

const getPatientGender = (patient: any) => {
  return patient.gender || patient.profile?.gender || patient.patientProfile?.gender;
};

const getPatientField = (patient: any, field: string) => {
    return patient[field] || patient.profile?.[field] || patient.patientProfile?.[field];
};

const getPatientVital = (patient: any, field: string) => {
    // Exclusively use recent appointment vitals as requested; fallback disabled.
    return patient.latestVitals?.[field] || '';
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

function PatientsList() {
  const { isAuthenticated } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | any>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
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
      fetchPatients();
    }
  }, [isAuthenticated, currentPage, debouncedSearch, selectedHospital]);

  const fetchHospitals = async () => {
    try {
      const data = await adminService.getHospitalsClient();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch hospitals");
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const resp = await adminService.getUsersClient({
        role: 'patient',
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        hospitalId: selectedHospital || undefined
      });
      if (resp && resp.users) {
        setPatients(resp.users);
        setTotalPages(resp.pagination?.pages || 1);
        setTotalPatients(resp.pagination?.total || resp.users.length || 0);
      } else if (Array.isArray(resp)) {
        setPatients(resp);
        setTotalPages(1);
        setTotalPatients(resp.length);
      } else {
        setPatients([]);
        setTotalPages(1);
        setTotalPatients(0);
      }
    } catch (err: any) {
      console.error("Failed to fetch patients", err);
      toast.error("Failed to fetch patients");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const loadToast = toast.loading("Preparing export...");
    try {
      const resp = await adminService.getUsersClient({
        role: 'patient',
        page: 1,
        limit: 10000,
        search: debouncedSearch,
        hospitalId: selectedHospital || undefined
      });
      const allPatients = resp?.users || (Array.isArray(resp) ? resp : []);

      const csvData = allPatients.map((p: any, index: number) => ({
        'SI No': index + 1,
        'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '--',
        'Name': p.name || p.user?.name || '--',
        'Mobile Number': p.mobile || p.user?.mobile || '--',
        'Age': getPatientAge(p) || '--'
      }));

      const headers = ['SI No', 'Date', 'Name', 'Mobile Number', 'Age'];
      const csvRows = [headers.join(',')];
      for (const row of csvData) {
        const values = headers.map(header => {
          const val = row[header as keyof typeof row] || '';
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Patients_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export downloaded successfully!", { id: loadToast });
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export patients", { id: loadToast });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Delete Patient",
      message: "Are you sure you want to delete this patient account? This will permanently remove their records from the system.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await adminService.deleteUserClient(id);
          setPatients(patients.filter((p) => p._id !== id));
          toast.success("Patient deleted successfully");
        } catch (err: any) {
          toast.error("Failed to delete patient");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setEditingPatient({ ...patient });
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateUserClient(editingPatient._id, {
        name: editingPatient.name,
        email: editingPatient.email,
        mobile: editingPatient.mobile
      });

      setPatients(patients.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));
      setEditingPatient(null);
      toast.success("Patient updated successfully");
    } catch (err: any) {
      toast.error("Failed to update patient");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredPatients = patients;

  const headers = ["Patient", "Age/Gender", "Contact", "Registered", "Status", "Actions"];



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

      <PageHeader
        title="Patients Management"
        subtitle="Manage patient records and system access"
        icon={<Activity className="text-purple-500" />}
      />

      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-4 md:mb-6 mx-2 md:mx-0">
        <div className="w-full lg:w-[70%] flex gap-2 md:gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email or mobile..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full border rounded-xl pl-9 md:pl-12 pr-4 py-2 md:py-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div className="shrink-0 flex flex-col items-center justify-center bg-blue-500/5 border rounded-xl px-3 py-[7px] md:px-4 md:py-2 min-w-[60px] md:min-w-[80px]" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-[8px] md:text-[9px] uppercase font-bold text-gray-400 tracking-wider leading-none mb-0.5">Total</span>
            <span className="text-sm md:text-base font-black text-blue-500 leading-none">{totalPatients}</span>
          </div>
          <button
            onClick={handleExport}
            className="shrink-0 flex items-center gap-1.5 bg-green-500/10 text-green-600 border border-green-200 rounded-xl px-3 py-[7px] md:px-4 md:py-2 hover:bg-green-500/20 transition-colors text-xs font-bold"
            title="Export all patients to CSV"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>

        <div className="w-full lg:w-[30%] flex flex-row items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <input
              list="hospital-options"
              type="text"
              placeholder="Hospital Filter..."
              value={hospitalSearch}
              onChange={(e) => {
                  const targetVal = e.target.value;
                  setHospitalSearch(targetVal);
                  const matchingHospital = hospitals.find(h => h.name === targetVal);
                  if (matchingHospital) {
                      setSelectedHospital(matchingHospital._id);
                      setCurrentPage(1);
                  } else {
                      setSelectedHospital("");
                      setCurrentPage(1);
                  }
              }}
              className="w-full border rounded-xl pl-3 pr-8 py-2 md:py-3 text-[11px] md:text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
            <datalist id="hospital-options">
              {hospitals.map(h => (
                <option key={h._id} value={h.name} />
              ))}
            </datalist>
            
            {selectedHospital || hospitalSearch ? (
              <button 
                onClick={() => { setSelectedHospital(""); setHospitalSearch(""); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1"
              >
                <X size={14} />
              </button>
            ) : (
              <Building2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-gray-800 border rounded-xl px-1.5 py-1.5 shadow-sm" style={{ borderColor: 'var(--border-color)' }}>
            <Button
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-1 md:px-2 py-1 h-7 text-[10px] md:text-xs tracking-wider font-bold"
            >
              PREV
            </Button>
            <span className="text-[10px] md:text-[11px] text-gray-500 font-bold px-1 min-w-[32px] text-center">
              {currentPage}/{Math.max(1, totalPages)}
            </span>
            <Button
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-1 md:px-2 py-1 h-7 text-[10px] md:text-xs tracking-wider font-bold"
            >
              NEXT
            </Button>
          </div>
        </div>
      </div>

      <Table headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={6} className="py-24 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm font-medium opacity-50">Loading patients...</p>
              </div>
            </td>
          </tr>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <tr
              key={patient._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap min-w-[120px] md:min-w-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[10px] md:text-xs ${getColor(patient.name)}`}>
                    {getInitials(patient.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-[11px] md:text-sm truncate">{patient.name}</div>
                    <div className="text-[9px] md:text-xs opacity-50 font-mono mt-0.5">{patient._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                <div className="flex flex-col">
                  <span className="text-[11px] md:text-sm">{getPatientAge(patient) ? `${getPatientAge(patient)} Years` : 'Age N/A'}</span>
                  <span className="text-[9px] md:text-xs opacity-50 capitalize">{getPatientGender(patient) || 'Unknown'}</span>
                </div>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                <div className="font-medium text-[11px] md:text-sm">{patient.mobile || 'No Mobile'}</div>
                <div className="text-[9px] md:text-xs opacity-60 mt-0.5">{patient.email}</div>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                <div className="font-medium text-[11px] md:text-sm">
                  {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </div>
                <div className="text-[9px] md:text-xs opacity-60 mt-0.5">
                  {patient.createdAt ? new Date(patient.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4">
                <Badge variant={patient.status === 'active' ? 'success' : 'danger'}>
                  {patient.status.toUpperCase()}
                </Badge>
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4">
                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(e, patient)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, patient._id)}
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
            <td colSpan={6} className="py-12 text-center text-gray-500 italic">
              No patients found.
            </td>
          </tr>
        )}
      </Table>

      {/* Pagination moved to header array */}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPatient}
        onClose={() => setEditingPatient(null)}
        title="Edit Patient Info"
      >
        {editingPatient && (
          <form onSubmit={handleUpdatePatient} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingPatient.name}
              onChange={e => setEditingPatient({ ...editingPatient, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingPatient.email}
              onChange={e => setEditingPatient({ ...editingPatient, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingPatient.mobile || ''}
              onChange={e => setEditingPatient({ ...editingPatient, mobile: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingPatient(null)}>
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
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Patient Record"
        maxWidth="max-w-2xl"
      >
        {selectedPatient && (
          <div className="space-y-4 md:space-y-6 overflow-y-auto overflow-x-hidden p-1 pr-2 no-scrollbar" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center gap-3 md:gap-4 border-b pb-4 md:pb-6" style={{ borderColor: 'var(--border-color)' }}>
              <div className={`w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-2xl flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-sm ${getColor(selectedPatient.name)}`}>
                {getInitials(selectedPatient.name)}
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{selectedPatient.name}</h2>
                <div className="flex flex-wrap gap-2 mt-1 md:mt-2">
                  <Badge variant={selectedPatient.status === 'active' ? 'success' : 'danger'}>
                    {selectedPatient.status.toUpperCase()}
                  </Badge>
                  <Badge variant="info">PATIENT</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-3 md:space-y-4">
                <div>
                  <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Contact Details</span>
                  <p className="mt-0.5 md:mt-1 font-medium text-sm md:text-base">{selectedPatient.mobile || 'N/A'}</p>
                  <p className="text-xs md:text-sm opacity-70 truncate">{selectedPatient.email}</p>
                </div>
                <div>
                  <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Address</span>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm">
                    {(() => {
                      const addr = getPatientField(selectedPatient, 'address');
                      if (typeof addr === 'object' && addr !== null) {
                        return `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}, ${addr.country || ''}`.replace(/^, /, '').replace(/, , /g, ', ');
                      }
                      return addr || 'Address not listed';
                    })()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Age</span>
                    <p className="mt-0.5 md:mt-1 text-base md:text-lg font-bold">{getPatientAge(selectedPatient) || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Gender</span>
                    <p className="mt-0.5 md:mt-1 text-base md:text-lg font-bold capitalize">{getPatientGender(selectedPatient) || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">Date of Birth</span>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium">{getPatientField(selectedPatient, 'dob') ? new Date(getPatientField(selectedPatient, 'dob')).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 text-red-500">
                <ShieldAlert size={16} className="w-4 h-4 md:w-[18px] md:h-[18px] shrink-0" />
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider">Medical Alerts & Allergies</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="p-2.5 md:p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400">Allergies</span>
                  <p className="text-xs md:text-sm font-medium mt-0.5">{getPatientField(selectedPatient, 'allergies') || 'NONE REPORTED'}</p>
                </div>
                <div className="p-2.5 md:p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400">Conditions</span>
                  <p className="text-xs md:text-sm font-medium mt-0.5">{getPatientField(selectedPatient, 'conditions') || 'NONE REPORTED'}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 md:pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span className="flex items-center gap-2 text-[10px] md:text-xs uppercase font-bold text-gray-500 tracking-wider">
                Vital Information 
                {getPatientVital(selectedPatient, 'bloodPressure') && <Badge variant="info" className="text-[8px] md:text-[9px] px-1 py-0 h-auto">Updated recently</Badge>}
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 text-[10px] md:text-xs font-bold">H</div>
                  <div>
                    <span className="text-[9px] md:text-[10px] text-gray-400 block leading-none">Height</span>
                    <span className="text-xs md:text-sm font-bold">{getPatientVital(selectedPatient, 'height') || '--'} {getPatientVital(selectedPatient, 'height') ? 'cm' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 text-[10px] md:text-xs font-bold">W</div>
                  <div>
                    <span className="text-[9px] md:text-[10px] text-gray-400 block leading-none">Weight</span>
                    <span className="text-xs md:text-sm font-bold">{getPatientVital(selectedPatient, 'weight') || '--'} {getPatientVital(selectedPatient, 'weight') ? 'kg' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 text-[10px] md:text-xs font-bold">B</div>
                  <div>
                    <span className="text-[9px] md:text-[10px] text-gray-400 block leading-none">Blood Group</span>
                    <span className="text-xs md:text-sm font-bold">{getPatientField(selectedPatient, 'bloodGroup') || '--'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-[10px] md:text-xs font-bold">BP</div>
                  <div>
                    <span className="text-[9px] md:text-[10px] text-gray-400 block leading-none">Blood Pressure</span>
                    <span className="text-xs md:text-sm font-bold">{getPatientVital(selectedPatient, 'bloodPressure') || '--'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 text-[10px] md:text-xs font-bold">T</div>
                  <div>
                    <span className="text-[9px] md:text-[10px] text-gray-400 block leading-none">Temperature</span>
                    <span className="text-xs md:text-sm font-bold">{getPatientVital(selectedPatient, 'temperature') || '--'} {getPatientVital(selectedPatient, 'temperature') ? 'Â°F' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 text-[10px] md:text-xs font-bold">O2</div>
                  <div>
                    <span className="text-[9px] md:text-[10px] text-gray-400 block leading-none">SpO2 Level</span>
                    <span className="text-xs md:text-sm font-bold">{getPatientVital(selectedPatient, 'spO2') || '--'} {getPatientVital(selectedPatient, 'spO2') ? '%' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="primary" onClick={() => setSelectedPatient(null)}>
                Close Record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Patients...</div>}>
      <PatientsList />
    </Suspense>
  );
}

export default React.memo(PatientsPage);
