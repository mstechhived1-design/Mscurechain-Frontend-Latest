"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  Phone,
  User,
  Send,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, Button } from "@/components/admin";
import { useCreateLeave } from "@/lib/integrations/hooks/useStaffQueries";

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "other", label: "Other" }
];

function DoctorLeaveRequest() {
  const router = useRouter();
  const createLeaveMutation = useCreateLeave();

  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    additionalNotes: "",
    emergencyContactName: "",
    emergencyContactMobile: "",
    emergencyContactRelationship: "",
    handoverNotes: ""
  });

  const loading = createLeaveMutation.isPending;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing / selecting
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ── Required core fields ──────────────────────────────────────
    if (!formData.leaveType) {
      newErrors.leaveType = "Please select a leave type";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Please select a start date";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Please select an end date";
    }

    // ── Reason validation ─────────────────────────────────────────
    const trimmedReason = formData.reason.trim();
    if (!trimmedReason) {
      newErrors.reason = "Please provide a reason for leave";
    } else if (trimmedReason.length < 10) {
      newErrors.reason = "Reason must be at least 10 characters";
    }

    // ── Date logic ────────────────────────────────────────────────
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        newErrors.startDate = "Start date cannot be in the past";
      }
      if (start > end) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    // ── Emergency contact cross-field validation ──────────────────
    // If any one field is filled, all three become required
    const hasAnyContactField =
      formData.emergencyContactName.trim() ||
      formData.emergencyContactMobile.trim() ||
      formData.emergencyContactRelationship.trim();

    if (hasAnyContactField) {
      if (!formData.emergencyContactName.trim()) {
        newErrors.emergencyContactName = "Contact name is required";
      }

      if (!formData.emergencyContactMobile.trim()) {
        newErrors.emergencyContactMobile = "Contact mobile is required";
      } else if (!/^\d{10}$/.test(formData.emergencyContactMobile.trim())) {
        newErrors.emergencyContactMobile = "Enter a valid 10-digit mobile number";
      }

      if (!formData.emergencyContactRelationship.trim()) {
        newErrors.emergencyContactRelationship = "Relationship is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      const leaveData = {
        leaveType: formData.leaveType as any,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
        additionalNotes: formData.additionalNotes.trim() || undefined,
        emergencyContact: formData.emergencyContactName.trim()
          ? {
            name: formData.emergencyContactName.trim(),
            mobile: formData.emergencyContactMobile.trim(),
            relationship: formData.emergencyContactRelationship.trim()
          }
          : undefined,
        handoverNotes: formData.handoverNotes.trim() || undefined
      };

      await createLeaveMutation.mutateAsync(leaveData);

      toast.success("Leave request submitted successfully!", { duration: 4000 });

      // Reset form
      setFormData({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        additionalNotes: "",
        emergencyContactName: "",
        emergencyContactMobile: "",
        emergencyContactRelationship: "",
        handoverNotes: ""
      });
      setErrors({});

      // Redirect to leave history
      setTimeout(() => {
        router.push("/doctor/leaves");
      }, 1000);
    } catch (err: any) {
      console.error("Leave request error:", err);
      toast.error(err.message || "Failed to submit leave request", { duration: 5000 });
    }
  };

  const reasonLength = formData.reason.trim().length;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="pt-2 sm:pt-4">
        {/* Ultra Compact Dynamic Header */}
        <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden z-20">
            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
            </div>
            
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                            Request Leave
                        </h1>
                        <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Submit a leave application for approval
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>
        {/* ── Leave Details ─────────────────────────────────────── */}
        <Card title="Leave Details" icon={<FileText className="text-blue-500" />} padding="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Leave Type */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.leaveType ? "border-red-500" : ""
                  }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.leaveType
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              >
                <option value="">Select Leave Type</option>
                {LEAVE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.leaveType && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.leaveType}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startDate ? "border-red-500" : ""
                  }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.startDate
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.startDate && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.startDate}
                </p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                style={{ color: "var(--text-color)" }}
              >
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.endDate ? "border-red-500" : ""
                  }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.endDate
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.endDate && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="mt-4">
            <label
              className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
              style={{ color: "var(--text-color)" }}
            >
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide a detailed reason for leave (minimum 10 characters)..."
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.reason ? "border-red-500" : ""
                }`}
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--text-color)",
                borderColor: errors.reason
                  ? "var(--error-color, #ef4444)"
                  : "var(--border-color)"
              }}
            />
            {/* Character counter + error row */}
            <div className="flex items-center justify-between mt-1">
              {errors.reason ? (
                <p className="text-red-500 text-[10px] flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.reason}
                </p>
              ) : (
                <span />
              )}
              <span
                className={`text-[10px] font-medium ml-auto ${reasonLength === 0
                    ? "text-gray-400"
                    : reasonLength < 10
                      ? "text-amber-500"
                      : "text-green-500"
                  }`}
              >
                {reasonLength} / 10 min
              </span>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mt-4">
            <label
              className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
              style={{ color: "var(--text-color)" }}
            >
              Additional Notes
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional information..."
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--text-color)",
                borderColor: "var(--border-color)"
              }}
            />
          </div>
        </Card>

        {/* ── Emergency Contact ─────────────────────────────────── */}
        <Card
          title="Emergency Contact"
          icon={<Phone className="text-red-500" />}
          padding="p-4 sm:p-6"
        >
          <p className="text-[10px] sm:text-xs text-gray-500 mb-4 italic">
            Optional — if any field below is filled, all three become required.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contact Name */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact name"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.emergencyContactName ? "border-red-500" : ""
                  }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.emergencyContactName
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.emergencyContactName && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.emergencyContactName}
                </p>
              )}
            </div>

            {/* Contact Mobile */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Contact Mobile
              </label>
              <input
                type="tel"
                name="emergencyContactMobile"
                value={formData.emergencyContactMobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.emergencyContactMobile ? "border-red-500" : ""
                  }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.emergencyContactMobile
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.emergencyContactMobile && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.emergencyContactMobile}
                </p>
              )}
            </div>

            {/* Relationship */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                placeholder="e.g., Spouse, Parent"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.emergencyContactRelationship ? "border-red-500" : ""
                  }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.emergencyContactRelationship
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.emergencyContactRelationship && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.emergencyContactRelationship}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ── Work Handover ─────────────────────────────────────── */}
        <Card
          title="Work Handover"
          icon={<User className="text-green-500" />}
          padding="p-4 sm:p-6"
        >
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
              style={{ color: "var(--text-color)" }}
            >
              Handover Notes
            </label>
            <textarea
              name="handoverNotes"
              value={formData.handoverNotes}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide details about work handover, patient assignments, or any important notes for colleagues covering your duties..."
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--text-color)",
                borderColor: "var(--border-color)"
              }}
            />
          </div>
        </Card>

        {/* ── Action Buttons ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 pb-8 sm:pb-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/doctor/leaves")}
            disabled={loading}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-sm"
          >
            View My Leaves
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Send size={16} />}
            className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-lg shadow-lg hover:shadow-xl"
          >
            Submit Leave Request
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(DoctorLeaveRequest);
