"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
  User,
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  Briefcase
} from "lucide-react";
import toast from "react-hot-toast";
import { Card, FormInput } from "@/components/admin";
import { InfrastructureCheck } from "../../../components/InfrastructureCheck";

function CreateHR() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    honorific: "Mr",
    name: "",
    email: "",
    mobile: "",
    password: "",
    gender: "",
    dateOfBirth: "",
    employeeId: "",
    designation: "HR Manager",
    department: "Human Resources",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    
    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.mobile || !formData.password) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      await hospitalAdminService.createHR(formData);
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-hrs'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });
      toast.success("HR Manager created successfully");
      router.push("../hr");
    } catch (error: any) {
      toast.error(error.message || "Failed to create HR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfrastructureCheck>
      <div className="max-w-7xl mx-auto pb-12 space-y-6">
        <div className="bg-white rounded-2xl p-3 md:p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add HR Manager</h1>
            <p className="text-gray-500 text-xs">Register new HR personnel for your hospital.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="Personal Information" icon={<User className="text-blue-500" />} padding="p-2 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 ml-1">Honorific<span className="text-rose-500 ml-0.5">*</span></label>
                <select name="honorific" value={formData.honorific} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none">
                  <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
                </select>
              </div>
              <FormInput label="Full Name" type="text" name="name" required
                value={formData.name} onChange={handleChange} />
              
              <FormInput label="Email Address" type="email" name="email" required
                value={formData.email} onChange={handleChange} />

              <FormInput label="Mobile Number" type="tel" name="mobile" required
                value={formData.mobile} onChange={handleChange} />

              <div className="relative space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 ml-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <FormInput label="Date of Birth" type="date" name="dateOfBirth"
                value={formData.dateOfBirth} onChange={handleChange} />
            </div>
          </Card>

          <Card title="Work Information" icon={<Briefcase className="text-indigo-500" />} padding="p-2 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput label="Employee ID" type="text" name="employeeId"
                value={formData.employeeId} onChange={handleChange} />
              <FormInput label="Designation" type="text" name="designation"
                value={formData.designation} onChange={handleChange} readOnly />
              <FormInput label="Department" type="text" name="department"
                value={formData.department} onChange={handleChange} readOnly />
            </div>
          </Card>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} /> Create HR Record</>}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </InfrastructureCheck>
  );
}

export default CreateHR;
