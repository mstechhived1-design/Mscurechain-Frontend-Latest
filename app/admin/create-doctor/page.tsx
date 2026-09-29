'use client';

import React, { useState, useEffect } from "react";
import { adminService } from "@/lib/integrations";
import { Stethoscope, Building2, UserPlus, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  PageHeader,
  Card,
  FormInput,
  FormSelect,
  FormTextarea,
  Button,
  HospitalSearchSelect
} from "@/components/admin";
import type { Hospital, CreateDoctorRequest } from "@/lib/integrations";


function CreateDoctor() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingHospitals, setFetchingHospitals] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [imageSource, setImageSource] = useState<"url" | "upload">("url");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    gender: "Male",
    hospitalId: "",
    specialties: "",
    qualification: "",
    experienceStart: "",
    consultationFee: "",
    bio: "",
    profilePic: ""
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      if (/^\d{0,10}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    // Validate Full Name, Specialties, Qualification: characters and special characters only (no numbers)
    if (name === "name" || name === "specialties" || name === "qualification") {
      if (/^[^0-9]*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, we'd upload this to a server
    // For now, we'll just simulate it or toast
    toast("Image upload simulated. In production, this would upload to S3/Cloudinary.");
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
      const payload: CreateDoctorRequest = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        gender: formData.gender,
        medicalRegistrationNumber: formData.mobile, // Temporary - use mobile as placeholder
        experienceStart: formData.experienceStart,
        profilePic: formData.profilePic || undefined,
        bio: formData.bio,
        specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
        consultationFee: Number(formData.consultationFee),
        qualifications: formData.qualification.split(",").map(s => s.trim()).filter(Boolean),
        assignHospitals: [
          {
            hospitalId: formData.hospitalId,
            specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
            consultationFee: Number(formData.consultationFee)
          }
        ]
      };

      await adminService.createDoctorClient(payload);
      toast.success(`Doctor account created successfully!`, { duration: 5000 });

      // Reset form
      setFormData({
        name: "",
        email: "",
        mobile: "",
        password: "",
        gender: "Male",
        hospitalId: "",
        specialties: "",
        qualification: "",
        experienceStart: "",
        consultationFee: "",
        bio: "",
        profilePic: ""
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create doctor account");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Add New Doctor"
        subtitle="Provision a new healthcare professional account"
        icon={<Stethoscope className="text-blue-500" />}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PERSONAL INFO SECTION */}
          <Card title="Account Information" padding="p-6">
            <div className="space-y-4">
              <FormInput
                label="Full Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Dr. John Doe"
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Mobile Number"
                  name="mobile"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10 digit number"
                />
                <FormSelect
                  label="Gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  options={[
                    { label: "Male", value: "Male" },
                    { label: "Female", value: "Female" },
                    { label: "Other", value: "Other" }
                  ]}
                />
              </div>

              <div className="relative">
                <FormInput
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Secure password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-blue-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </Card>

          {/* PROFESSIONAL INFO */}
          <Card title="Professional Profile" padding="p-6">
            <div className="space-y-4">
              <HospitalSearchSelect
                hospitals={hospitals}
                loading={fetchingHospitals}
                value={formData.hospitalId}
                onChange={(id) => setFormData(prev => ({ ...prev, hospitalId: id }))}
                label="Assign Hospital"
                accentColor="blue"
                required
              />

              <FormInput
                label="Specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Cardiology, Neurology (comma separated)"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Qualification"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="MBBS, MD"
                />
                <FormInput
                  label="Experience Start"
                  name="experienceStart"
                  type="date"
                  max={today}
                  value={formData.experienceStart}
                  onChange={handleChange}
                />
              </div>

              <FormInput
                label="Consultation Fee (₹)"
                name="consultationFee"
                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                value={formData.consultationFee}
                onChange={handleChange}
                placeholder="Eg. 500"
              />
            </div>
          </Card>
        </div>

        <Card title="Doctor Bio & Image" padding="p-6">
          <div className="space-y-6">
            <FormTextarea
              label="Professional Bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about your medical background and expertise..."
              rows={4}
            />

            <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    checked={imageSource === "url"}
                    onChange={() => setImageSource("url")}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium group-hover:text-blue-500">Image URL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    checked={imageSource === "upload"}
                    onChange={() => setImageSource("upload")}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium group-hover:text-blue-500">Upload File</span>
                </label>
              </div>

              {imageSource === "url" ? (
                <FormInput
                  label="Profile Photo URL"
                  name="profilePic"
                  value={formData.profilePic}
                  onChange={handleChange}
                  placeholder="https://example.com/doctor-avatar.jpg"
                  icon={<ImageIcon size={18} className="text-gray-400" />}
                />
              ) : (
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--secondary-color)' }}>Select Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              )}

              {formData.profilePic && (
                <div className="mt-4 flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <img
                    src={formData.profilePic}
                    alt="Preview"
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/10"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.png"; }}
                  />
                  <div>
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Live Preview</p>
                    <p className="text-sm opacity-70">This is how the doctor's profile image will appear to patients.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            loading={loading}
            icon={<UserPlus size={18} />}
            className="px-16 py-4 text-lg"
          >
            Create Doctor Profile
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(CreateDoctor);
