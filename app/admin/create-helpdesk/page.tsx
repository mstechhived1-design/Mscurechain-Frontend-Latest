'use client';

import React, { useState, useEffect } from "react";
import { adminService } from "@/lib/integrations";
import { Headphones, Building2, UserPlus, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  PageHeader,
  Card,
  FormInput,
  Button,
  HospitalSearchSelect
} from "@/components/admin";
import type { Hospital, CreateHelpdeskRequest } from "@/lib/integrations";

function CreateHelpdesk() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingHospitals, setFetchingHospitals] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    hospitalId: ""
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const data = await adminService.getHospitalsClient();
      setHospitals(data);
    } catch (err) {
      console.error("Failed to fetch hospitals", err);
    } finally {
      setFetchingHospitals(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      if (/^\d{0,10}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    if (name === "name") {
      if (/^[^0-9]*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospitalId) {
      toast.error("Please select a hospital.");
      return;
    }

    if (formData.mobile.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits.");
      return;
    }

    if (!formData.email.includes("@") || !formData.email.includes(".com")) {
      toast.error("Email must contain '@' and '.com'");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateHelpdeskRequest = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        hospitalId: formData.hospitalId
      };

      await adminService.createHelpdeskClient(payload);
      toast.success("Helpdesk staff account created successfully!");
      setFormData({ name: "", email: "", mobile: "", password: "", hospitalId: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create helpdesk account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Register Front Desk Staff"
        subtitle="Create dedicated helpdesk accounts for hospital branches"
        icon={<Headphones className="text-purple-500" />}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Staff Assignment" padding="p-8">
          <div className="space-y-6">
            {/* ── Hospital Selector (shared component) ── */}
            <HospitalSearchSelect
              hospitals={hospitals}
              loading={fetchingHospitals}
              value={formData.hospitalId}
              onChange={(id) => setFormData(prev => ({ ...prev, hospitalId: id }))}
              label="Assign to Hospital Location"
              accentColor="purple"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Full Name of Staff Member"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. HelpDesk - Sunrise West"
              />
              <FormInput
                label="Official Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="helpdesk@sunrise.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Mobile Number (10 Digits)"
                name="mobile"
                required
                value={formData.mobile}
                onChange={handleChange}
                placeholder="9876543210"
              />
              <div className="relative">
                <FormInput
                  label="Temporary Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Set initial password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-purple-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <Building2 size={20} />
              </div>
              <div className="text-xs text-purple-400 leading-relaxed pt-1">
                This account will have exclusive access to manage patient queues and appointment check-ins for the selected hospital branch.
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            loading={loading}
            icon={<UserPlus size={18} />}
            className="w-full md:w-auto px-16 py-4 text-lg"
          >
            Create Staff Account
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(CreateHelpdesk);
