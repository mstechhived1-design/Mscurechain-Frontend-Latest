"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";
import { ConfirmModal } from "@/components/admin/Modal";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Award,
  Clock,
  CreditCard,
  Globe,
  Stethoscope,
  Edit,
  Briefcase,
  UserCheck,
  Ban,
} from "lucide-react";
import { PageHeader, Button } from "@/components/admin";

function HRDoctorDetailPage() {
  const router = useRouter();
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const id = params.id as string;

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      try {
        const data = await hospitalAdminService.getDoctorById(id);
        setDoctor(data.doctor);
        return;
      } catch (detailError: any) {
        if (detailError.status === 404 ||
          detailError.message?.includes('404') ||
          detailError.message?.toLowerCase().includes('not found')) {
          const data = await hospitalAdminService.getDoctors();
          const doctorData = data.doctors?.find((doc: any) => doc._id === id);

          if (!doctorData) {
            throw new Error("Doctor not found");
          }

          setDoctor(doctorData);
          return;
        }
        throw detailError;
      }
    } catch (error: any) {
      console.error("Failed to fetch doctor:", error);
      toast.error(error.message || "Failed to load doctor details");
      router.push(`/${hospitalId}/hr/hospital/doctors`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const isActivating = doctor.status === 'inactive';
    const action = isActivating ? 'reactivate' : 'deactivate';

    setConfirmModal({
      isOpen: true,
      title: `${isActivating ? 'Reactivate' : 'Deactivate'} Physician`,
      message: `Are you sure you want to ${action} Dr. ${doctor?.name}? Account access will be ${isActivating ? 'restored' : 'suspended'}.`,
      onConfirm: async () => {
        setDeleteLoading(true);
        try {
          const { hrService } = await import("@/lib/integrations");
          if (isActivating) {
            await hrService.activateStaff(doctor?.doctorProfileId || id);
          } else {
            await hrService.deactivateStaff(doctor?.doctorProfileId || id);
          }
          toast.success(`Dr. ${doctor?.name} has been ${isActivating ? 'reactivated' : 'deactivated'}`);
          fetchDoctor();
        } catch (error: any) {
          console.error(`Failed to ${action} doctor:`, error);
          toast.error(error.message || `Failed to ${action} doctor`);
          setDeleteLoading(false);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Accessing doctor registry...</p>
        </div>
      </div>
    );
  }

  if (!doctor) return null;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Unified Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-white dark:bg-gray-800/40 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          {/* Back Button */}
          <button
            onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors`)}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium text-sm transition-all pr-4 md:border-r border-gray-200 dark:border-gray-700 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>

          {/* Doctor Identity Header */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 shadow-inner">
              <Stethoscope size={24} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {doctor.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                  {doctor.doctorId || 'DOCTOR PROFILE'}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${doctor.status === 'inactive'
                  ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                  }`}>
                  {doctor.status === 'inactive' ? 'Inactive' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors/edit/${id}`)}
            icon={<Edit size={16} />}
            variant="secondary"
            className="!text-xs !py-2.5 !px-5 !rounded-xl border-gray-200 transition-all hover:border-blue-300 hover:bg-blue-50/50"
          >
            Edit Profile
          </Button>
          <Button
            onClick={handleToggleStatus}
            loading={deleteLoading}
            icon={doctor.status === 'inactive' ? <UserCheck size={16} /> : <Ban size={16} />}
            className={doctor.status === 'inactive'
              ? "bg-emerald-600 hover:bg-emerald-700 text-white !text-xs !py-2.5 !px-5 !rounded-xl border-none shadow-lg shadow-emerald-200/50 dark:shadow-none transition-all active:scale-95"
              : "bg-amber-500 hover:bg-amber-600 text-white !text-xs !py-2.5 !px-5 !rounded-xl border-none shadow-lg shadow-amber-200/50 dark:shadow-none transition-all active:scale-95"
            }
          >
            {doctor.status === 'inactive' ? 'Reactivate' : 'Deactivate'} Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            {doctor.profilePic ? (
              <img
                src={doctor.profilePic}
                alt={doctor.name}
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border border-gray-200 dark:border-gray-600 shadow-sm p-1 bg-white"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                <Stethoscope className="text-white" size={48} />
              </div>
            )}
            <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{doctor.name}</h2>
            <p className="text-blue-600 font-medium mb-2 text-sm">{doctor.designation || 'Consultant'}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail size={16} className="text-green-500" /> Contact Details
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md text-blue-500">
                  <Mail size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-400">Email</p>
                  <p className="text-gray-700 dark:text-gray-200 truncate">{doctor.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 p-1.5 bg-green-50 rounded-md text-green-500">
                  <Phone size={14} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Mobile</p>
                  <p className="text-gray-700 dark:text-gray-200">{doctor.mobile}</p>
                </div>
              </div>
              {doctor.address && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 p-1.5 bg-red-50 rounded-md text-red-500">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Location</p>
                    <p className="text-gray-700 dark:text-gray-200 text-xs">
                      {[doctor.address.city, doctor.address.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-blue-500" /> Professional Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b pb-2 border-gray-50">
                <span className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Fee</span>
                <span className="font-bold text-green-600">₹{doctor.consultationFee || '0'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b pb-2 border-gray-50">
                <span className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Duration</span>
                <span className="font-semibold text-gray-900 dark:text-white">{doctor.consultationDuration || 15} min</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-2">
                <span className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Experience</span>
                <span className="font-semibold text-gray-900 dark:text-white">{doctor.experienceYears || '0'} Years</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Award size={16} className="text-purple-500" /> Academic & Clinical Focus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {doctor.specialties?.map((spec: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase border border-blue-100">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Qualifications</h4>
                <div className="flex flex-wrap gap-2">
                  {doctor.qualifications?.map((qual: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-[10px] font-bold uppercase border border-purple-100">
                      {qual}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <CreditCard size={16} className="text-yellow-500" /> Medical Registry Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Registration No</p>
                <p className="font-bold text-gray-900 dark:text-white">{doctor.medicalRegistrationNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Registration Council</p>
                <p className="font-bold text-gray-900 dark:text-white">{doctor.registrationCouncil || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" /> Faculty Schedule
            </h3>
            {doctor.availability?.length > 0 ? (
              <div className="space-y-3">
                {doctor.availability.map((slot: any, idx: number) => {
                  const formatAMPM = (time: string) => {
                    if (!time) return "N/A";
                    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) return time;
                    const [hours, minutes] = time.split(':');
                    let h = parseInt(hours);
                    const m = minutes || "00";
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12;
                    h = h ? h : 12;
                    return `${h}:${m} ${ampm}`;
                  };
                  return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {slot.days?.map((day: string) => (
                          <span key={day} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase">{day}</span>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-gray-700">{formatAMPM(slot.startTime)} - {formatAMPM(slot.endTime)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No slots registered</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" /> Communication
            </h3>
            <div className="flex flex-wrap gap-2">
              {doctor.languages?.map((lang: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100 uppercase">{lang}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

export default React.memo(HRDoctorDetailPage);
