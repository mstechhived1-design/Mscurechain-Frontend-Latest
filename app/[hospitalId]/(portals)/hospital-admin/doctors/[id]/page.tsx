"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";
import { ConfirmModal } from "@/components/admin/Modal";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Award,
  Calendar,
  IndianRupee,
  Clock,
  Building,
  CreditCard,
  Shield,
  Globe,
  Stethoscope,
  Edit,
  Trash2,
  FileText,
  User,
  Briefcase,
  Eye
} from "lucide-react";
import { Card, Button } from "@/components/admin";
import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";


function DoctorDetailPage() {
  const router = useRouter();
  const pathname = usePathname() as string;
  const basePath = pathname.includes("/hr") ? "/hr" : "/hospital-admin";
  const params = useParams() as any;
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

  const [viewerModal, setViewerModal] = useState({
    isOpen: false,
    url: "",
    title: ""
  });


  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      // Try to get doctor details from backend first
      try {
        const data = await hospitalAdminService.getDoctorById(id);
        setDoctor(data.doctor);
        return;
      } catch (detailError: any) {
        // If detail endpoint fails (404), fall back to list endpoint
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
        // Re-throw other errors
        throw detailError;
      }
    } catch (error: any) {
      console.error("Failed to fetch doctor:", error);
      toast.error(error.message || "Failed to load doctor details");
      router.push(`${basePath}/doctors`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Deactivate Doctor",
      message: `Are you sure you want to deactivate Dr. ${doctor?.name}? The doctor will no longer be active but their profile will be preserved.`,
      onConfirm: async () => {
        setDeleteLoading(true);
        try {
          await hospitalAdminService.deleteDoctor(doctor?.doctorProfileId || id);
          toast.success(`Dr. ${doctor?.name} has been deactivated successfully`);
          router.push(`${basePath}/doctors`);
        } catch (error: any) {
          console.error("Failed to deactivate doctor:", error);
          toast.error(error.message || "Failed to deactivate doctor");
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
          <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--secondary-color)' }}>Loading doctor details...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 p-2 ">
      {/* Unified Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-white dark:bg-gray-800/40 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          {/* Back Button */}
          <button
            onClick={() => router.push(`${basePath}/doctors`)}
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
          {doctor.status !== 'inactive' ? (
            <>
              <Button
                onClick={() => router.push(`${basePath}/doctors/edit/${id}`)}
                icon={<Edit size={16} />}
                variant="secondary"
                className="!text-xs !py-2.5 !px-5 !rounded-xl border-gray-200 transition-all hover:border-blue-300 hover:bg-blue-50/50"
              >
                Edit Profile
              </Button>
              <Button
                onClick={handleDelete}
                loading={deleteLoading}
                icon={<Trash2 size={16} />}
                className="bg-red-600 hover:bg-red-700 text-white !text-xs !py-2.5 !px-5 !rounded-xl border-none shadow-lg shadow-red-200/50 dark:shadow-none transition-all active:scale-95"
              >
                Deactivate
              </Button>
            </>
          ) : (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="text-gray-400 text-[11px] font-medium italic">Profile Deactivated</p>
            </div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Overview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            {doctor.profilePic ? (
              <img
                src={doctor.profilePic}
                alt={doctor.name}
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border border-gray-200 dark:border-gray-600 shadow-sm p-1 bg-white dark:bg-gray-800"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-none">
                <Stethoscope className="text-white" size={48} />
              </div>
            )}
            <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
              {doctor.name}
            </h2>
            <p className="text-blue-600 dark:text-blue-400 font-medium mb-2 text-sm">
              {doctor.designation || 'Consultant'}
            </p>
          </div>


          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail size={16} className="text-green-500" /> Contact Information
            </h3>
            <div className="space-y-4">
              {doctor.email && (
                <div className="flex items-start gap-3 text-sm group">
                  <div className="mt-0.5 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-500">
                    <Mail size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Email</p>
                    <a href={`mailto:${doctor.email}`} className="text-gray-700 dark:text-gray-200 hover:text-blue-600 truncate block">
                      {doctor.email}
                    </a>
                  </div>
                </div>
              )}

              {doctor.mobile && (
                <div className="flex items-start gap-3 text-sm group">
                  <div className="mt-0.5 p-1.5 bg-green-50 dark:bg-green-900/20 rounded-md text-green-500">
                    <Phone size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Mobile</p>
                    <a href={`tel:${doctor.mobile}`} className="text-gray-700 dark:text-gray-200 hover:text-green-600">
                      {doctor.mobile}
                    </a>
                  </div>
                </div>
              )}

              {doctor.gender && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-md text-purple-500">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Gender</p>
                    <p className="text-gray-700 dark:text-gray-200 capitalize">{doctor.gender}</p>
                  </div>
                </div>
              )}

              {doctor.dateOfBirth && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md text-orange-500">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Date of Birth</p>
                    <p className="text-gray-700 dark:text-gray-200">
                      {new Date(doctor.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {doctor.address && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 p-1.5 bg-red-50 dark:bg-red-900/20 rounded-md text-red-500">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Address</p>
                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                      {[doctor.address.street, doctor.address.city, doctor.address.state, doctor.address.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-blue-500" /> Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700/50 pb-2">
                <span className="text-gray-500">Consultation Fee</span>
                <span className="font-bold text-green-600">₹{doctor.consultationFee || 'Not set'}</span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700/50 pb-2">
                <span className="text-gray-500">Duration</span>
                <span className="font-semibold text-gray-900 dark:text-white">{doctor.consultationDuration || 15} mins</span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700/50 pb-2">
                <span className="text-gray-500">Max Appointments</span>
                <span className="font-semibold text-gray-900 dark:text-white">{doctor.maxAppointmentsPerDay || 20}/day</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Detailed Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Details */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Award size={16} className="text-purple-500" /> Professional Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {doctor.specialties && doctor.specialties.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {doctor.specialties.map((spec: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-100 dark:border-blue-800"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {doctor.qualifications && doctor.qualifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Qualifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {doctor.qualifications.map((qual: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold border border-green-100 dark:border-green-800 flex items-center gap-1.5"
                      >
                        <Award size={12} /> {qual}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {doctor.degreeCertificate && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Degree Certificate</h4>
                  <button
                    onClick={() => setViewerModal({ isOpen: true, url: doctor.degreeCertificate, title: "Degree Certificate" })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <Eye size={16} /> View Degree
                  </button>
                </div>
              )}


              {doctor.doctorateCertificate && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Doctorate Certificate</h4>
                  <button
                    onClick={() => setViewerModal({ isOpen: true, url: doctor.doctorateCertificate, title: "Doctorate Certificate" })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <Eye size={16} /> View Doctorate
                  </button>
                </div>
              )}


              {doctor.internshipCertificate && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Internship Certificate</h4>
                  <button
                    onClick={() => setViewerModal({ isOpen: true, url: doctor.internshipCertificate, title: "Internship Certificate" })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Eye size={16} /> View Internship
                  </button>
                </div>
              )}

            </div>

            {doctor.experienceStart && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-orange-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Experience</h4>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  Practicing since <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(doctor.experienceStart).toLocaleDateString()}</span>
                  {doctor.experienceYears && <span className="opacity-75"> ({doctor.experienceYears} years)</span>}
                </p>
              </div>
            )}
          </div>

          {/* Medical Registration */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 dark:bg-yellow-900/10 rounded-bl-[100px] pointer-events-none -mr-16 -mt-16"></div>

            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 relative z-10">
              <CreditCard size={16} className="text-yellow-500" /> Medical Registration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Registration Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">{doctor.medicalRegistrationNumber || 'Not provided'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Council</p>
                <p className="font-semibold text-gray-900 dark:text-white">{doctor.registrationCouncil || 'National Medical Commission (NMC)'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Registration Year</p>
                <p className="font-semibold text-gray-900 dark:text-white">{doctor.registrationYear || 'Not specified'}</p>
              </div>

              {doctor.registrationExpiryDate && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Expiry Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(doctor.registrationExpiryDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {doctor.registrationCertificate && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-medium text-gray-400 mb-2">Registration Certificate</p>
                <button
                  onClick={() => setViewerModal({ isOpen: true, url: doctor.registrationCertificate, title: "Registration Certificate" })}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-600 rounded-lg text-sm font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all active:scale-95"
                >
                  <Eye size={16} /> View Document
                </button>
              </div>
            )}

          </div>

          {/* Designation & Scheduling */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Building size={16} className="text-indigo-500" /> Designation & Scheduling
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 mb-8">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Designation</p>
                <p className="font-semibold text-gray-900 dark:text-white">{doctor.designation || 'Consultant'}</p>
              </div>

              {doctor.employeeId && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Employee ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded inline-block">{doctor.employeeId}</p>
                </div>
              )}
            </div>


            {doctor.availability && doctor.availability.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/20 p-2 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Clock size={14} /> Weekly Schedule
                </h4>
                <div className="space-y-3">
                  {doctor.availability.map((slot: any, idx: number) => {
                    const formatAMPM = (time: string) => {
                      if (!time) return "N/A";
                      // If it already has AM/PM, return it
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
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm"
                      >
                        <div className="flex flex-wrap gap-2 mb-2">
                          {slot.days?.map((day: string) => (
                            <span
                              key={day}
                              className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded text-[10px] font-bold uppercase"
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {formatAMPM(slot.startTime)} - {formatAMPM(slot.endTime)}
                          {slot.breakStart && slot.breakEnd && (
                            <span className="text-gray-400 ml-2 text-xs">
                              (Break: {formatAMPM(slot.breakStart)} - {formatAMPM(slot.breakEnd)})
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* System Permissions */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield size={16} className="text-red-500" /> System Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(doctor.permissions || {
                canAccessEMR: true,
                canAccessBilling: false,
                canAccessLabReports: true,
                canPrescribe: true,
                canAdmitPatients: false,
                canPerformSurgery: false
              }).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${value
                    ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                    : 'border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-xs font-medium ${value ? 'text-green-800 dark:text-green-300' : 'text-gray-500 dark:text-gray-500'}`}>
                      {key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" /> About
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {doctor.bio || `Dr. ${doctor.name} is a ${doctor.designation || 'Consultant'} specializing in ${doctor.specialties?.join(', ') || 'medical care'}.`}
            </p>
          </div>

          {/* Languages & Awards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctor.languages && doctor.languages.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" /> Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages.map((lang: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm flex items-center gap-2 font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {doctor.awards && doctor.awards.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award size={16} className="text-amber-500" /> Awards
                </h3>
                <div className="space-y-2">
                  {doctor.awards.map((award: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg"
                    >
                      <Award className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" size={14} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{award}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Signature */}
          {doctor.signature && (
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText size={16} className="text-purple-500" /> Digital Signature
              </h3>
              <img
                src={doctor.signature}
                alt="Doctor's Signature"
                className="max-w-xs h-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 md:p-4 bg-white"
              />
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        loading={deleteLoading}
      />
      <DocumentViewerModal
        isOpen={viewerModal.isOpen}
        onClose={() => setViewerModal(prev => ({ ...prev, isOpen: false }))}
        url={viewerModal.url}
        title={viewerModal.title}
      />
    </div>

  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(DoctorDetailPage);
