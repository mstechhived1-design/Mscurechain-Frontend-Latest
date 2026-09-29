"use client";

import React, { useState } from "react";
import { adminService } from "@/lib/integrations";
import { Shield, UserPlus, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";

function CreateAdmin() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      if (/^\d{0,10}$/.test(value)) {
        setFormData({ ...formData, [name]: value });
      }
    } else if (name === "name") {
      // Allow only characters and spaces
      if (/^[a-zA-Z\s]*$/.test(value)) {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await adminService.createAdminClient(formData);
      toast.success("Admin created successfully!");
      setFormData({ name: "", email: "", mobile: "", password: "" });
    } catch (err: any) {
      toast.error(err.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={<Shield className="text-green-500" />}
        title="Create New Admin"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Full Name"
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
          />

          <FormInput
            label="Email Address"
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <FormInput
            label="Mobile Number (10 digits)"
            type="tel"
            name="mobile"
            required
            value={formData.mobile}
            onChange={handleChange}
          />

          <div className="relative">
            <FormInput
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-10 text-gray-500 hover:text-green-500"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<UserPlus size={18} />}
            className="w-full py-3"
          >
            Create Admin
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default React.memo(CreateAdmin);
