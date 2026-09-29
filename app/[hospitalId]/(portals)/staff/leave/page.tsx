"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, FileText, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, Button, FormInput, FormSelect, FormTextarea } from "@/components/admin";
import { adminService } from "@/lib/integrations";

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "other", label: "Other" }
];

function StaffLeaveRequest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    numberOfDays: 1,
    reason: "",
    additionalNotes: "",
    workHandover: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    const updatedData = { ...formData, [name]: value };

    // Calculate number of days when dates change
    if (name === 'startDate' || name === 'endDate') {
      if (updatedData.startDate && updatedData.endDate) {
        updatedData.numberOfDays = calculateDays(updatedData.startDate, updatedData.endDate);
      }
    }

    setFormData(updatedData);
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    if (new Date(formData.startDate) < new Date()) {
      toast.error("Start date cannot be in the past");
      return;
    }

    setLoading(true);

    try {
      await adminService.requestLeaveClient(formData);
      toast.success("Leave request submitted successfully");
      router.push("/staff/leaves");
    } catch (error: any) {
      console.error("Failed to submit leave request:", error);
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader
        icon={<Calendar className="text-blue-500" />}
        title="Request Leave"
        subtitle="Submit a new leave request for approval"
      />

      <Card padding="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <FormSelect
            label="Leave Type *"
            name="leaveType"
            value={formData.leaveType}
            onChange={handleChange}
            options={LEAVE_TYPES}
            required
          />

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Start Date *"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />

            <FormInput
              label="End Date *"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>

          {/* Number of Days */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
              Number of Days
            </label>
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: 'var(--secondary-color)' }} />
              <span className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>
                {formData.numberOfDays} day{formData.numberOfDays !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Reason */}
          <FormTextarea
            label="Reason for Leave *"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Please provide a detailed reason for your leave request..."
            rows={4}
            required
          />

          {/* Additional Notes */}
          <FormTextarea
            label="Additional Notes"
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleChange}
            placeholder="Any additional information or special circumstances..."
            rows={3}
          />

          {/* Work Handover */}
          <FormTextarea
            label="Work Handover Plan"
            name="workHandover"
            value={formData.workHandover}
            onChange={handleChange}
            placeholder="Describe how your work will be handled during your absence..."
            rows={3}
          />

          {/* Important Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-500 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Important Information
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Leave requests must be approved by your hospital administrator</li>
                  <li>• You will receive a notification once your request is reviewed</li>
                  <li>• Medical certificates may be required for sick leave</li>
                  <li>• Emergency leaves may require immediate supervisor approval</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1"
            >
              <FileText size={16} className="mr-2" />
              Submit Request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default React.memo(StaffLeaveRequest);
