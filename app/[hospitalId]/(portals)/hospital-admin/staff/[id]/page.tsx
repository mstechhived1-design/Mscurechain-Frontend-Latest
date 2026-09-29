"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { hospitalAdminService, getStaffTrainingHistoryAction } from "@/lib/integrations";
import {
  ArrowLeft,
  Mail,
  Clock,
  Building,
  Users,
  Edit,
  Trash2,
  FileText,
  User,
  ShieldCheck,
  Award,
  Activity,
  CreditCard,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2
} from "lucide-react";

function StaffDetailPage() {
  const router = useRouter();
  const params = useParams() as any;
  const pathname = usePathname() as string;
  const basePath = pathname.includes('/hr') ? '/hr' : '/hospital-admin';
  const hospitalId = params.hospitalId as string;
  const id = params.id as string;

  const [staff, setStaff] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchShifts = useCallback(async () => {
    try {
      const data = await hospitalAdminService.getShifts();
      setShifts(data);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      try {
        const data = await hospitalAdminService.getStaffById(id);
        setStaff(data.staff);
        // Fetch training history for admin view
        const historyRes = await getStaffTrainingHistoryAction(id);
        setTrainingHistory(historyRes?.data?.trainings || []);
        return;
      } catch (detailError: any) {
        if (detailError.status === 404 ||
          detailError.message?.includes('404') ||
          detailError.message?.toLowerCase().includes('not found')) {
          const data = await hospitalAdminService.getStaff();
          const staffData = data.staff?.find((member: any) => (member._id || member.staffProfileId) === id);

          if (!staffData) {
            throw new Error("Staff member not found");
          }


          setStaff(staffData);
          // Fetch training history for admin view
          const historyRes = await getStaffTrainingHistoryAction(id);
          setTrainingHistory(historyRes?.data?.trainings || []);
          return;
        }
        throw detailError;
      }
    } catch (error: any) {
      console.error("Failed to fetch staff:", error);
      toast.error(error.message || "Failed to load staff details");
      router.push(`/${hospitalId}${basePath}/staff`);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const init = async () => {
      await fetchShifts();
      if (id) {
        await fetchStaff();
      }
    };
    init();
  }, [id, fetchShifts, fetchStaff]);

  const handleToggleStatus = async () => {
    const isActivating = staff.status !== 'active';
    const action = isActivating ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} ${staff?.name}?`)) {
      return;
    }

    setStatusLoading(true);
    try {
      if (isActivating) {
        await hospitalAdminService.activateStaff(id);
      } else {
        await hospitalAdminService.deactivateStaff(id);
      }
      toast.success(`${staff?.name} has been ${action}d successfully`);
      setStaff({ ...staff, status: isActivating ? 'active' : 'inactive' });
    } catch (error: any) {
      console.error(`Failed to ${action} staff:`, error);
      toast.error(error.message || `Failed to ${action} staff`);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`CAUTION: This will permanently purge ${staff?.name} from the active system directory. This action cannot be undone. Proceed?`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      await hospitalAdminService.deleteStaff(id);
      toast.success(`${staff?.name} has been permanently removed`);
      router.push(`/${hospitalId}${basePath}/staff`);
    } catch (error: any) {
      console.error("Failed to delete staff:", error);
      toast.error(error.message || "Operation failed during directory purge");
      setDeleteLoading(false);
    }
  };

  const shiftName = useMemo(() => {
    if (!staff?.shift || shifts.length === 0) return staff?.shift || 'General';
    const s = shifts.find(sh => sh._id === staff.shift);
    return s ? s.name : staff.shift;
  }, [staff?.shift, shifts]);

  const formattedDepartment = useMemo(() => {
    const dept = staff?.department;
    if (Array.isArray(dept)) {
      return dept.filter(Boolean).join(', ');
    }
    return dept || 'Not Assigned';
  }, [staff?.department]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-20 text-center">
        <div className="relative">
          <div className="h-20 w-20 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-blue-500 animate-pulse" size={24} />
          </div>
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">Compiling Personnel Profile...</p>
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header / Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 md:p-6 border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.back()}
              className="hidden md:flex p-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
              {staff.name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-100 dark:border-blue-500/20">
                  Staff Registry
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${staff.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                  : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20'
                  }`}>
                  {staff.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{staff.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID: {staff.employeeId || 'N/A'}</p>
                <div className="h-1 w-1 rounded-full bg-gray-300" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{formattedDepartment}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/${hospitalId}${basePath}/staff/edit/${id}`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
            >
              <Edit size={14} /> Edit Profile
            </button>

            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${staff.status === 'active'
                ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                }`}
            >
              {staff.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}
              {staff.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-600 hover:text-white transition-all active:scale-95 dark:bg-rose-500/10 dark:border-rose-500/20"
            >
              {deleteLoading ? (
                <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Trash2 size={14} /> Purge</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Card */}
        <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 mb-5">
              <User className="text-blue-500" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{staff.name}</h2>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-1.5">{staff.designation || 'Personnel'}</p>

            <div className="w-full h-px bg-gray-50 dark:bg-gray-800 my-6" />

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-left p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Department Unit</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formattedDepartment}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-left p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Joining Date</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'Not Set'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-left p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Employment Basis</p>
                  <p className="text-sm font-semibold text-blue-600 uppercase italic">{staff.employmentType || 'Full-Time'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                  <Building2 size={18} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Unit Assignment</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-white/5 pb-3">
                  <span className="text-gray-500 font-medium">Department</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{formattedDepartment === 'Not Assigned' ? 'Clinical' : formattedDepartment}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-white/5 pb-3">
                  <span className="text-gray-500 font-medium">Designation</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{staff.designation || 'Staff'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Experience</span>
                  <span className="text-blue-600 font-bold">{staff.experienceYears || '0'} Years</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                  <Clock size={18} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Schedule</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-white/5 pb-3">
                  <span className="text-gray-500 font-medium">Assigned Shift</span>
                  <span className="text-gray-900 dark:text-white font-bold uppercase">{shiftName}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-white/5 pb-3">
                  <span className="text-gray-500 font-medium">Duty Window</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{staff.workingHours?.start || '09:00'} - {staff.workingHours?.end || '17:00'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Weekly Off</span>
                  <span className="text-rose-500 font-bold uppercase">{staff.weeklyOff?.join(', ') || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
                  <Mail size={18} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Contact Information</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Email Address</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{staff.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Phone Number</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{staff.mobile || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Residential Address</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {staff.address && (staff.address.city || staff.address.street)
                      ? `${staff.address.street ? staff.address.street + ', ' : ''}${staff.address.city}, ${staff.address.state}`
                      : 'Location not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <CreditCard size={18} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Financial & Identity</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Base Salary</p>
                  <p className="text-sm font-black text-blue-600">₹{(staff.baseSalary || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">PAN Number</p>
                  <p className="text-sm font-semibold uppercase">{staff.panNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Aadhar No</p>
                  <p className="text-sm font-semibold">{staff.aadharNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">PF Number</p>
                  <p className="text-sm font-semibold uppercase">{staff.pfNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">ESI Number</p>
                  <p className="text-sm font-semibold uppercase">{staff.esiNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">UAN Number</p>
                  <p className="text-sm font-semibold">{staff.uanNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional License & Documents */}
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                <Award size={18} />
              </div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Professional License & Documents</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-white/5 pb-3">
                  <span className="text-gray-500 font-medium">Registration Number</span>
                  <span className="text-gray-900 dark:text-white font-bold">{staff.qualificationDetails?.registrationNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">License Validity</span>
                  <span className={`font-bold ${staff.qualificationDetails?.licenseValidityDate && new Date(staff.qualificationDetails.licenseValidityDate) < new Date()
                    ? 'text-rose-500'
                    : 'text-emerald-600'
                    }`}>
                    {staff.qualificationDetails?.licenseValidityDate
                      ? new Date(staff.qualificationDetails.licenseValidityDate).toLocaleDateString()
                      : 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Degree', key: 'degreeCertificate' },
                  { label: 'Med. Council', key: 'medicalCouncilRegistration' },
                  { label: 'Nur. Council', key: 'nursingCouncilRegistration' }
                ].map((doc) => {
                  const docData = staff.documents?.[doc.key];
                  return (
                    <div key={doc.key} className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                      <FileText size={20} className={docData?.url ? "text-blue-500" : "text-gray-300"} />
                      <p className="text-[8px] font-bold text-gray-500 uppercase mt-2 text-center">{doc.label}</p>
                      {docData?.url ? (
                        <a
                          href={docData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 p-1 bg-green-50 dark:bg-green-500/10 text-green-600 rounded-md"
                        >
                          <CheckCircle2 size={12} />
                        </a>
                      ) : (
                        <span className="mt-1 text-[8px] font-black text-gray-300">MISSING</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bank Details & Emergency Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Building size={14} className="text-gray-300" /> Bank Disclosure
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-bold">{staff.bankDetails?.accountName || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Account No</span>
                  <span className="font-bold">{staff.bankDetails?.accountNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Bank / IFSC</span>
                  <span className="font-bold">{staff.bankDetails?.bankName} ({staff.bankDetails?.ifscCode})</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Users size={14} className="text-gray-300" /> Emergency Contact
              </p>
              {staff.emergencyContact ? (
                <div className="flex items-center justify-between p-2 md:p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{staff.emergencyContact.name}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">{staff.emergencyContact.relationship}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{staff.emergencyContact.mobile}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4">No emergency contact registered</p>
              )}
            </div>
          </div>

          {/* Qualifications, Skills & Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-purple-600">
                <FileText size={16} />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Qualifications</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...(staff.qualifications || []), ...(staff.qualificationDetails?.qualifications || [])].length > 0 ? (
                  Array.from(new Set([...(staff.qualifications || []), ...(staff.qualificationDetails?.qualifications || [])])).map((qual: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md text-[10px] font-bold uppercase">{qual}</span>
                  ))
                ) : <p className="text-[10px] text-gray-400 italic">None listed</p>}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <Activity size={16} />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Skills</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {staff.skills?.length > 0 ? staff.skills.map((skill: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold uppercase">{skill}</span>
                )) : <p className="text-[10px] text-gray-400 italic">None listed</p>}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <ShieldCheck size={16} />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Certifications</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {staff.certifications?.length > 0 ? staff.certifications.map((cert: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase">{cert}</span>
                )) : null}

                {/* Internship Certificates from Training Module */}
                {trainingHistory.filter(t => t.certificateUrl).map((training: any, idx: number) => (
                  <a
                    key={`training-${idx}`}
                    href={training.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-500/20"
                  >
                    <FileText size={10} /> {training.trainingName}
                  </a>
                ))}

                {(!staff.certifications || staff.certifications.length === 0) && trainingHistory.filter(t => t.certificateUrl).length === 0 && (
                  <p className="text-[10px] text-gray-400 italic">None listed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(StaffDetailPage);
