"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminService, createHRAction } from "@/lib/integrations";
import { UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button, HospitalSearchSelect } from "@/components/admin";
import type { Hospital } from "@/lib/integrations/types";

interface FormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  hospitalId: string;
}

function CreateHRPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    hospitalId: ""
  });

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const data = await adminService.getHospitalsClient();
      setHospitals(data || []);
    } catch (error: any) {
      toast.error("Failed to load hospitals");
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectedHospital = hospitals.find(h => h._id === formData.hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospitalId) {
      toast.error("Please select a target hospital.");
      return;
    }

    setLoading(true);
    try {
      const result = await createHRAction(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`HR account created for ${selectedHospital?.name}`);
      router.push("/admin/hr");
    } catch (err: any) {
      toast.error(err.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={<ShieldCheck className="text-blue-500" />}
        title="Provision HR Specialist"
        subtitle="Assign a dedicated Human Resource officer to a hospital node"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Station Assignment" padding="p-6">
          <HospitalSearchSelect
            hospitals={hospitals}
            loading={loadingHospitals}
            value={formData.hospitalId}
            onChange={(id) => setFormData(prev => ({ ...prev, hospitalId: id }))}
            label="Target Hospital"
            accentColor="blue"
            required
          />
        </Card>

        <Card title="Personnel Credentials" icon={<UserPlus className="text-blue-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Full Name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
            />
            <FormInput
              label="Professional Email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="hr@hospital.com"
            />
            <FormInput
              label="Mobile Access"
              name="mobile"
              required
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-digit mobile"
            />
            <div className="relative">
              <FormInput
                label="System Password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 opacity-50 hover:opacity-100"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={loading} className="px-12">Initialize HR Node</Button>
        </div>
      </form>
    </div>
  );
}

export default CreateHRPage;
