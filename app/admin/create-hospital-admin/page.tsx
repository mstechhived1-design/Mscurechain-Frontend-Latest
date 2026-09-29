"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminService, createHospitalAdminAction } from "@/lib/integrations";
import { Building2, UserPlus, Eye, EyeOff, Search } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";
import type { Hospital } from "@/lib/integrations/types";

interface FormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  hospitalId: string;
}

function CreateHospitalAdmin() {
  const router = useRouter();

  // Hospital Admin Data (Required)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    hospitalId: ""
  });

  // UI State
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

  // Fetch hospitals on mount
  useEffect(() => {
    fetchHospitals();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.hospital-dropdown-container')) {
        setShowHospitalDropdown(false);
      }
    };

    if (showHospitalDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHospitalDropdown]);

  // Filter hospitals based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = hospitals.filter(hospital =>
        hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.hospitalId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHospitals(filtered);
    } else {
      setFilteredHospitals(hospitals);
    }
  }, [searchQuery, hospitals]);

  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const data = await adminService.getHospitalsClient();
      setHospitals(data || []);
      setFilteredHospitals(data || []);
    } catch (error: any) {
      console.error("Failed to fetch hospitals:", error);
      toast.error(error.message || "Failed to load hospitals");
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Mobile number validation - only allow 10 digits
    if (name === "mobile") {
      if (!/^\d{0,10}$/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleHospitalSelect = (hospital: Hospital) => {
    setFormData(prev => ({ ...prev, hospitalId: hospital._id }));
    setShowHospitalDropdown(false);
    setSearchQuery(hospital.name);
  };

  const selectedHospital = hospitals.find(h => h._id === formData.hospitalId);

  const validateForm = (): boolean => {
    if (formData.mobile.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits.");
      return false;
    }

    if (!formData.hospitalId) {
      toast.error("Please select a hospital.");
      return false;
    }

    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill all Hospital Admin details.");
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", mobile: "", password: "", hospitalId: "" });
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const adminResult = await createHospitalAdminAction({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        hospitalId: formData.hospitalId
      });

      if (!adminResult.success) {
        throw new Error(adminResult.error || 'Failed to create hospital admin');
      }

      toast.success(`Hospital admin "${formData.name}" created successfully for ${selectedHospital?.name}!`, {
        duration: 5000,
      });

      resetForm();

      setTimeout(() => {
        router.push("/admin/hospital-admins");
      }, 2000);
    } catch (err: any) {
      let errorMessage = "Failed to create hospital admin";

      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = typeof err.error === 'string' ? err.error : err.error.message || errorMessage;
      }

      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={<Building2 className="text-blue-500" />}
        title="Create Hospital Staff"
        subtitle="Create dedicated hospital administrator account"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hospital Selection */}
        <Card title="Select Hospital" padding="p-6">
          <div className="relative hospital-dropdown-container">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
              Hospital <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || selectedHospital?.name || ""}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowHospitalDropdown(true);
                }}
                onFocus={() => setShowHospitalDropdown(true)}
                placeholder="Search and select a hospital"
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)',
                  borderColor: 'var(--border-color)'
                }}
                required
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {showHospitalDropdown && filteredHospitals.length > 0 && (
              <div
                className="absolute z-10 w-full mt-2 rounded-xl shadow-2xl max-h-60 overflow-y-auto border border-gray-100 dark:border-gray-700"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                {filteredHospitals.map((hospital) => (
                  <button
                    key={hospital._id}
                    type="button"
                    onClick={() => handleHospitalSelect(hospital)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="font-semibold" style={{ color: 'var(--text-color)' }}>
                      {hospital.name}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--secondary-color)' }}>
                      {hospital.hospitalId} • {hospital.address}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedHospital && (
              <div className="mt-3 p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/10" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  ✓ Selected: {selectedHospital.name}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--secondary-color)' }}>
                  {selectedHospital.hospitalId} 🏥{selectedHospital.address}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Hospital Admin Section */}
        <Card title="Hospital Administrator Details" icon={<UserPlus className="text-blue-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
            />

            <FormInput
              label="Email Address"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
            />

            <FormInput
              label="Mobile Number (10 digits)"
              type="tel"
              name="mobile"
              required
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-digit mobile"
            />

            <div className="relative">
              <FormInput
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-blue-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<UserPlus size={18} />}
            className="px-12 py-4 text-lg shadow-lg hover:shadow-xl"
          >
            Create Hospital Admin
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(CreateHospitalAdmin);
